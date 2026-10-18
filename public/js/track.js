/* ==========================================================================
   访客行为埋点（无依赖，约 3KB）
   --------------------------------------------------------------------------
   采集内容：页面浏览 / 来源与 UTM / 可见停留时长 / 滚动深度 / 外链与站内点击 / 电台播放
   不采集：任何输入框内容、Cookie、账号信息
   上报端点：POST /api/track（Cloudflare Pages Function，在那里补真实 IP 与地理位置）
   --------------------------------------------------------------------------
   设计要点：
   1. 停留时长按「页面可见」累计，切到后台不计时，比墙钟时间更接近真实收听时长。
   2. 用 text/plain 发送，避开 CORS 预检，页面关闭时 sendBeacon 才能送达。
   3. 全链路 try/catch —— 统计代码永远不能影响访客听电台。
   4. 本地开发和 ?notrack=1 不上报。
   ========================================================================== */
(function () {
  'use strict';

  if (window.__mrTrackInit) return;
  window.__mrTrackInit = true;

  var loc = window.location;
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') return;

  function store(kind, key) {
    try {
      var s = kind === 'session' ? window.sessionStorage : window.localStorage;
      var v = s.getItem(key);
      if (!v) {
        v = 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        s.setItem(key, v);
      }
      return v;
    } catch (e) {
      return 'anon';
    }
  }

  // 手动关闭：访问一次 ?notrack=1 后本浏览器不再上报
  try {
    if (/[?&]notrack=1/.test(loc.search)) {
      window.localStorage.setItem('mr_notrack', '1');
      return;
    }
    if (window.localStorage.getItem('mr_notrack') === '1') return;
  } catch (e) {}

  var VID = store('local', 'mr_vid'); // 同一浏览器长期
  var SID = store('session', 'mr_sid'); // 单次会话（标签页维度）

  var visibleMs = 0;
  var visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  var maxScroll = 0;
  var lastBeat = 0;
  var leftSent = false;

  function accumulate() {
    if (visibleSince !== null) {
      visibleMs += Date.now() - visibleSince;
      visibleSince = null;
    }
  }

  function calcScroll() {
    var doc = document.documentElement;
    var h = Math.max(doc.scrollHeight - window.innerHeight, 1);
    var pct = Math.round((window.pageYOffset / h) * 100);
    if (pct > maxScroll) maxScroll = Math.min(pct, 100);
  }

  function send(payload, beacon) {
    payload.vid = VID;
    payload.sid = SID;
    var body;
    try {
      body = JSON.stringify(payload);
    } catch (e) {
      return;
    }

    if (beacon && navigator.sendBeacon) {
      try {
        // text/plain 是「简单请求」：不触发预检，页面卸载时也能送达
        if (navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
      } catch (e) {}
    }

    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: body,
        keepalive: true,
        credentials: 'omit',
      })['catch'](function () {});
    } catch (e) {}
  }

  function utm() {
    var out = {};
    try {
      var q = new URLSearchParams(loc.search);
      out.us = q.get('utm_source') || undefined;
      out.um = q.get('utm_medium') || undefined;
      out.uc = q.get('utm_campaign') || undefined;
    } catch (e) {}
    return out;
  }

  // ---------------------------------------------------------------- 页面浏览
  function onView() {
    calcScroll();
    var base = {
      e: 'view',
      p: loc.pathname + loc.search.replace(/[?&]notrack=1/, ''),
      r: document.referrer || '',
      lg: (function () {
        try {
          return window.localStorage.getItem('mr_lang') || document.documentElement.lang || '';
        } catch (e) {
          return document.documentElement.lang || '';
        }
      })(),
      sc: (window.screen ? window.screen.width + 'x' + window.screen.height : ''),
    };
    var u = utm();
    for (var k in u) if (u[k] !== undefined) base[k] = u[k];
    send(base, false);
  }

  // ------------------------------------------------------------------ 停留心跳
  // 30 秒一次，且只在页面可见时；把累计可见时长随心跳写回同一条会话
  function beat() {
    if (document.visibilityState !== 'visible') return;
    accumulate();
    visibleSince = Date.now();
    if (visibleMs - lastBeat < 15000) return;
    lastBeat = visibleMs;
    calcScroll();
    send({ e: 'beat', d: visibleMs, s: maxScroll, p: loc.pathname }, true);
  }

  // -------------------------------------------------------------------- 点击
  function onClick(ev) {
    try {
      var el = ev.target;
      if (!el || !el.closest) return;
      var a = el.closest('a[href]');
      if (a) {
        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
        var label = (a.getAttribute('data-track') || a.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 70);
        var dest = href;
        try {
          var abs = new URL(href, loc.href);
          dest = abs.hostname === loc.hostname ? abs.pathname : abs.hostname + abs.pathname;
        } catch (e) {}
        send({ e: 'click', t: (label ? label + ' → ' : '') + dest.slice(0, 240), p: loc.pathname }, true);
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------- 播放
  // RadioPlayer 在点击播放时派发 mr:play（带电台名），这里只负责记录
  function onPlayEvent(ev) {
    try {
      var d = ev && ev.detail ? ev.detail : {};
      send({ e: 'play', t: '播放 · ' + (d.name || '未知电台'), p: loc.pathname }, true);
    } catch (e) {}
  }

  // 兜底：直接监听 <audio> 的 play（防止某些入口没派发 mr:play）
  function onAudioPlay(ev) {
    try {
      if (ev.target && ev.target.tagName === 'AUDIO') {
        var src = ev.target.currentSrc || ev.target.src || '';
        var host = '';
        try {
          host = new URL(src, loc.href).hostname;
        } catch (e) {}
        send({ e: 'play', t: '播放 · ' + (host || '音频流'), p: loc.pathname }, true);
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------- 离场
  function onLeave() {
    if (leftSent) return;
    leftSent = true;
    accumulate();
    calcScroll();
    send({ e: 'leave', d: visibleMs, s: maxScroll, p: loc.pathname }, true);
  }

  // -------------------------------------------------------------------- 挂载
  try {
    onView();

    document.addEventListener('click', onClick, true);
    document.addEventListener('play', onAudioPlay, true);
    window.addEventListener('mr:play', onPlayEvent);

    window.addEventListener(
      'scroll',
      function () {
        calcScroll();
      },
      { passive: true }
    );

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        visibleSince = Date.now();
      } else {
        accumulate();
        calcScroll();
        send({ e: 'beat', d: visibleMs, s: maxScroll, p: loc.pathname }, true);
      }
    });

    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    window.setInterval(beat, 30000);
  } catch (e) {}
})();
