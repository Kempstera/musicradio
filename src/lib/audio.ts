// 全局单例音频管理器：保证同一时刻只播放一路电台，支持 MP3/AAC 与 HLS
import Hls from 'hls.js';

let audio: HTMLAudioElement | null = null;
let hls: Hls | null = null;
let currentUrl: string | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCurrentUrl(): string | null {
  return currentUrl;
}

export function isPlaying(): boolean {
  return audio ? !audio.paused && !audio.ended : false;
}

export function isPaused(): boolean {
  return audio ? audio.paused : true;
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('play', emit);
    audio.addEventListener('pause', emit);
    audio.addEventListener('ended', emit);
    audio.addEventListener('error', emit);
    audio.addEventListener('stalled', () => {
      // 网络缓冲不足时尝试继续
      if (currentUrl) emit();
    });
  }
  return audio;
}

export function play(url: string, hlsStream: boolean): void {
  const a = ensureAudio();
  if (currentUrl === url && !a.paused) {
    a.pause();
    emit();
    return;
  }
  // 停止之前的流
  if (hls) {
    hls.destroy();
    hls = null;
  }
  if (hlsStream && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, backBufferLength: 30 });
    hls.loadSource(url);
    hls.attachMedia(a);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      a.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        emit();
      }
    });
  } else {
    a.src = url;
    a.play().catch(() => {
      emit();
    });
  }
  currentUrl = url;
  emit();
}

export function stop(): void {
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
  emit();
}
