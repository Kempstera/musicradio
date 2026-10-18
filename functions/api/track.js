// Cloudflare Pages Function —— 访客埋点采集端点
//
// 为什么必须放在边缘函数里：
//   浏览器 JS 拿不到访客真实 IP（只能拿到服务器地址），只有边缘节点
//   能通过 CF-Connecting-IP 头 + request.cf 拿到真实 IP、国家、城市、ASN。
//   所以前端只发「行为」，IP/地理在这里补齐后再写库。
//
// 隐私设计：
//   写库用 publishable key（等价 anon 角色），而 visit_logs 表只开放 INSERT、
//   不开放 SELECT —— 原始 IP 进得去、出不来。页面读的是 IP 已脱敏的视图。
//
// 事件类型：view（浏览）· beat（停留心跳）· leave（离场）· click（点击）· play（播放）
//
// 请求体用 text/plain 发送（而非 application/json），是为了避开 CORS 预检，
// 让 sendBeacon 在页面关闭时也能稳定送达。

const SUPABASE_URL = 'https://xivobmucjutdfoxmfjxu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3-qf8Tpy8aaB8QdvyiR5dg_xx1CzksE';

const EVENTS = new Set(['view', 'beat', 'leave', 'click', 'play']);
const MAX_BODY = 4096;

function clip(v, n) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > n ? s.slice(0, n) : s;
}

function parseUA(ua) {
  const u = ua || '';
  let device = 'desktop';
  if (/bot|crawler|spider|slurp|curl|wget|python-requests|headless|facebookexternalhit|whatsapp/i.test(u)) {
    device = 'bot';
  } else if (/iPad|Tablet|PlayBook|Silk/i.test(u)) {
    device = 'tablet';
  } else if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(u)) {
    device = 'mobile';
  }

  let browser = 'Other';
  // 国内入口优先识别：微信/QQ/微博的内置浏览器 UA 里都带 Chrome 或 Safari 字样，
  // 必须先判断，否则全被归成 Chrome/Safari，看不出真实来源。
  if (/MicroMessenger/i.test(u)) browser = 'WeChat';
  else if (/MQQBrowser/i.test(u)) browser = 'QQBrowser';
  else if (/Weibo/i.test(u)) browser = 'Weibo';
  else if (/Edg\//i.test(u)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(u)) browser = 'Opera';
  else if (/Firefox\/|FxiOS/i.test(u)) browser = 'Firefox';
  else if (/CriOS/i.test(u)) browser = 'Chrome';
  else if (/Chrome\//i.test(u)) browser = 'Chrome';
  else if (/Safari\//i.test(u)) browser = 'Safari';

  let os = 'Other';
  if (/Windows NT 10/i.test(u)) os = 'Windows 10/11';
  else if (/Windows/i.test(u)) os = 'Windows';
  else if (/Android/i.test(u)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(u)) os = 'iOS/iPadOS';
  else if (/Mac OS X/i.test(u)) os = 'macOS';
  else if (/CrOS/i.test(u)) os = 'ChromeOS';
  else if (/Linux/i.test(u)) os = 'Linux';

  return { device, browser, os };
}

function refHostOf(referrer) {
  if (!referrer) return '(direct)';
  try {
    const u = new URL(referrer);
    // 站内跳转单独归类，避免自引用污染来源榜
    if (/musicradio\.signupeverywhere\.cc$/i.test(u.hostname)) return '(站内)';
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '(direct)';
  }
}

export async function onRequestPost({ request }) {
  let body;
  try {
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return new Response(null, { status: 204 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  const event = EVENTS.has(body.e) ? body.e : 'view';
  const ua = request.headers.get('user-agent') || '';
  const { device, browser, os } = parseUA(ua);

  // Cloudflare 边缘提供的访客上下文（本地 dev 环境下为空，自动降级为 null）
  const cf = request.cf || {};
  const ip = request.headers.get('CF-Connecting-IP') || null;

  const row = {
    event,
    visitor_id: clip(body.vid, 64),
    visit_id: clip(body.sid, 64),
    path: clip(body.p, 512),
    duration_ms: Number.isFinite(body.d) ? Math.max(0, Math.min(Math.round(body.d), 86400000)) : 0,
    scroll_pct: Number.isFinite(body.s) ? Math.max(0, Math.min(Math.round(body.s), 100)) : 0,
    target: clip(body.t, 512),
  };

  // 地理/IP/UA 只在首个 view 事件写全，后续心跳只补时长，节省存储与带宽
  if (event === 'view') {
    Object.assign(row, {
      referrer: clip(body.r, 1024),
      ref_host: clip(refHostOf(body.r), 128),
      utm_source: clip(body.us, 96),
      utm_medium: clip(body.um, 96),
      utm_campaign: clip(body.uc, 96),
      ip,
      country: cf.country ? String(cf.country) : null,
      country_code: cf.country || null,
      region: cf.region ? String(cf.region) : null,
      city: cf.city ? String(cf.city) : null,
      timezone: cf.timezone ? String(cf.timezone) : null,
      colo: cf.colo ? String(cf.colo) : null,
      asn: Number.isFinite(cf.asn) ? cf.asn : null,
      ua: clip(ua, 512),
      device,
      browser,
      os,
      lang: clip(body.lg, 24),
      screen: clip(body.sc, 24),
      meta: body.m && typeof body.m === 'object' ? body.m : null,
    });
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/visit_logs`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch {
    // 统计失败绝不能影响访客听电台，静默吞掉
  }

  return new Response(null, { status: 204 });
}

// 预检兜底（正常路径不会触发，因为前端用 text/plain 规避了预检）
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}
