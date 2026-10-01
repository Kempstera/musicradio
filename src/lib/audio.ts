// 全局单例音频管理器：保证同一时刻只播放一路电台，支持 MP3/AAC 与 HLS
//
// 移动端/iPad 卡顿问题的针对性优化（保留 <audio>，以维持 iOS 锁屏/后台继续播放）：
//  1. Safari / iOS / iPadOS 上 HLS 走系统原生 AVFoundation 播放（省电且最稳），
//     不再用 hls.js 的 MSE 路径（iOS 17.1+ 的 ManagedMediaSource 在音频场景不稳定）。
//  2. 非 Safari 的 HLS 走 hls.js，并针对弱网调低起始码率、增大缓冲、加入错误自愈。
//  3. 原生流（MP3/AAC/HLS）断流/缓冲不足时自动重连，模拟原生播放器的自愈能力，
//     缓解移动网络波动导致的「时不时卡顿」。
//  4. 极少数仅有 http:// 协议的电台流，经本站 /api/stream 边缘代理转发为同源 https，
//     绕过浏览器的混合内容（mixed content）拦截，使其能在安全页面上播放。
import Hls from 'hls.js';

let audio: HTMLAudioElement | null = null;
let hls: Hls | null = null;
let currentUrl: string | null = null;
let currentHls = false;

// 断流自动重连状态
let stalled = false;
let stallTimer: number | null = null;
let reconnectCount = 0;
const MAX_RECONNECT = 6;
const RECONNECT_DELAY = 4000;

// 播放状态机：idle（空闲）→ loading（连接中）→ playing / stalled（缓冲） / error（失联）
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'stalled' | 'error';
let status: PlaybackStatus = 'idle';

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function setStatus(next: PlaybackStatus) {
  if (status !== next) {
    status = next;
    emit();
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrentUrl(): string | null {
  return currentUrl;
}

export function getStatus(): PlaybackStatus {
  return status;
}

export function isPlaying(): boolean {
  return audio ? !audio.paused && !audio.ended : false;
}

export function isPaused(): boolean {
  return audio ? audio.paused : true;
}

// 仅有 http:// 协议的流，改写为本站白名单边缘代理（同源 https），
// 规避浏览器对混合内容的拦截；https 流保持不变。
function resolveUrl(url: string): string {
  return url.startsWith('http://') ? `/api/stream?u=${encodeURIComponent(url)}` : url;
}

// 浏览器能否原生播放 HLS（Safari / iOS / iPadOS 的 AVFoundation 原生支持）
function nativeHlsSupported(): boolean {
  try {
    const a = document.createElement('audio');
    return !!a.canPlayType('application/vnd.apple.mpegurl');
  } catch {
    return false;
  }
}

function clearStallTimer() {
  if (stallTimer !== null) {
    window.clearTimeout(stallTimer);
    stallTimer = null;
  }
}

// 原生流（非 hls.js）断流/缓冲不足时自动重连
function scheduleReconnect() {
  if (stallTimer !== null || !currentUrl || hls) return; // hls.js 由自身错误处理自愈
  stallTimer = window.setTimeout(() => {
    stallTimer = null;
    if (!currentUrl || !stalled || reconnectCount >= MAX_RECONNECT) return;
    const a = audio;
    if (!a) return;
    reconnectCount += 1;
    // 重新加载当前直播源（跳到最新直播点），立即恢复播放
    a.load();
    a.play().catch(() => {});
  }, RECONNECT_DELAY);
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = document.createElement('audio');
    audio.preload = 'auto';
    // 挂到文档流中（iOS 对游离的媒体元素偶发不加载），但视觉上完全隐藏
    audio.style.position = 'fixed';
    audio.style.left = '-9999px';
    audio.style.top = '0';
    audio.style.width = '1px';
    audio.style.height = '1px';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    document.body.appendChild(audio);

    audio.addEventListener('play', () => setStatus('playing'));
    audio.addEventListener('pause', emit);
    audio.addEventListener('ended', emit);
    audio.addEventListener('error', () => {
      stalled = true;
      setStatus('error');
      scheduleReconnect();
    });
    audio.addEventListener('waiting', () => {
      stalled = true;
      setStatus('stalled');
      scheduleReconnect();
    });
    audio.addEventListener('stalled', () => {
      stalled = true;
      setStatus('stalled');
      scheduleReconnect();
    });
    audio.addEventListener('playing', () => {
      stalled = false;
      reconnectCount = 0;
      clearStallTimer();
      setStatus('playing');
    });
    audio.addEventListener('canplay', () => {
      stalled = false;
      clearStallTimer();
      setStatus('playing');
    });
    audio.addEventListener('timeupdate', () => {
      if (!audio || audio.paused) return;
      stalled = false;
      clearStallTimer();
      setStatus('playing');
    });
  }
  return audio;
}

// 载入并播放一路流（复用 src 校验：同源 https 或经 /api/stream 代理）
function startStream(url: string, hlsStream: boolean): void {
  const a = ensureAudio();
  const src = resolveUrl(url);

  // 停止上一路流
  clearStallTimer();
  stalled = false;
  reconnectCount = 0;
  if (hls) {
    hls.destroy();
    hls = null;
  }

  setStatus('loading');

  if (hlsStream) {
    if (nativeHlsSupported()) {
      // Safari / iOS / iPadOS：走系统原生 HLS，最省电、最稳
      a.src = src;
      a.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false, // 纯音频流无需 Worker，避免移动端线程/内存抖动
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        abrEwmaDefaultEstimate: 128000, // 首帧从较低码率起播，弱网更稳
        startLevel: -1,
      });
      hls.loadSource(src);
      hls.attachMedia(a);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        a.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad(); // 网络级致命错误：重启拉流状态机
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError(); // 解码级错误：尝试恢复
        } else {
          setStatus('error');
        }
      });
    } else {
      // 既不支持原生 HLS 也无 MSE：直接赋值尝试
      a.src = src;
      a.play().catch(() => {});
    }
  } else {
    a.src = src;
    a.play().catch(() => {
      emit();
    });
  }

  currentUrl = url;
  currentHls = hlsStream;
  emit();
}

export function play(url: string, hlsStream: boolean): void {
  const a = ensureAudio();

  // 同一电台：正在播放 → 暂停；已暂停 → 继续
  if (currentUrl === url) {
    if (!a.paused && !a.ended) {
      a.pause();
    } else {
      a.play().catch(() => {});
    }
    emit();
    return;
  }

  startStream(url, hlsStream);
}

// 强制重新载入当前流（失联后的「重试」按钮）
export function retry(): void {
  if (!currentUrl) return;
  startStream(currentUrl, currentHls);
}

export function stop(): void {
  clearStallTimer();
  stalled = false;
  reconnectCount = 0;
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  currentUrl = null;
  currentHls = false;
  setStatus('idle');
}
