// 「Marie 80 岁生日」彩蛋 —— 会话级状态 + 1946 Jukebox 电台定义。
//
// 两个概念分开：
//  1) **序曲**（BIRTHDAY_OVERTURE_SRC）：事件驱动。每次用户把语言切到威尔士语时都播一遍，
//     播完自动接上 1946 Jukebox。时序逻辑在 BirthdayEgg.tsx。
//  2) **1946 Jukebox 电台卡**：会话级常驻。一旦激活，本次会话内**跨页面导航**（本站是 MPA，
//     每次跳转都是全新文档）依然出现在电台列表最顶部，直到关闭标签页。用 sessionStorage 承载。
//
// 注意：本模块**不静态 import** `./audio`（该模块含 577KB 的 hls.js）。
// 需要它的只有「真正开播」这一步，因此播放相关函数一律惰性加载，
// 这样任何只用到电台元信息 / 会话标志的组件（如首页的 MarieJukebox 岛）都不会拖带音频分包。
//
// 流的可用性：官方流只有 http:// 协议，会被 HTTPS 页面按混合内容拦截，因此经本站
// /api/stream 边缘代理播放（须在 functions/api/stream.js 白名单中登记）；
// 另备一路 https 流，主用流起不来时自动切换。
export const BIRTHDAY_OVERTURE_SRC = '/marie-birthday-song.mp3';

export const MARIE_JUKEBOX_ID = 'marie-jukebox-1946';
export const MARIE_JUKEBOX_NAME = "🎂 Marie's 1946 Jukebox";

/** 主用流：The UK 1940s Radio Station 官网公布的官方流（仅 http，128kbps MP3） */
export const JUKEBOX_PRIMARY = 'http://solid2.streamupsolutions.com:24929/stream';
/** 备用流：同为英国 1940 年代老歌台（Pumpkin FM 1940s Radio），https 直连无需代理 */
export const JUKEBOX_FALLBACK = 'https://cast2.asurahosting.com/proxy/1940sradio/stream';

export interface MarieStation {
  id: string;
  name: string;
  url: string;
  hls: boolean;
  codec: string;
  bitrate: number;
  tags: string;
  homepage: string;
}

export const MARIE_JUKEBOX: MarieStation = {
  id: MARIE_JUKEBOX_ID,
  name: MARIE_JUKEBOX_NAME,
  url: JUKEBOX_PRIMARY,
  hls: false,
  codec: 'MP3',
  bitrate: 128,
  tags: '1940s,Oldies',
  homepage: 'https://www.1940sukradio.co.uk/',
};

/** 该 URL 是否属于 Jukebox（主用或备用流） */
export function isJukeboxUrl(url: string | null): boolean {
  return url === JUKEBOX_PRIMARY || url === JUKEBOX_FALLBACK;
}

// —— 会话级激活标志 ————————————————————————————————————
const SESSION_KEY = 'mr_marie_jukebox';
const listeners = new Set<() => void>();

function readFlag(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

let active = typeof window !== 'undefined' ? readFlag() : false;

export function isJukeboxActive(): boolean {
  return active;
}

export function activateJukebox(): void {
  if (active) return;
  active = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 隐私模式下可能不可写：退化为「仅本页常驻」 */
  }
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// —— 播放控制（音频模块惰性加载）——————————————————————————
type AudioMod = typeof import('./audio');
let audioModPromise: Promise<AudioMod> | null = null;

function loadAudio(): Promise<AudioMod> {
  if (!audioModPromise) audioModPromise = import('./audio');
  return audioModPromise;
}

/**
 * 开播 1946 Jukebox：先走官方 http 流（经边缘代理），
 * 若 delayMs 内仍未进入播放态，自动切到 https 备用流。
 */
export async function startJukebox(delayMs = 8000): Promise<void> {
  const audio = await loadAudio();
  audio.play(JUKEBOX_PRIMARY, false);

  let settled = false;
  const off = audio.subscribe(() => {
    if (!settled && audio.getStatus() === 'playing') {
      settled = true;
      off();
    }
  });

  window.setTimeout(() => {
    if (settled) return;
    settled = true;
    off();
    if (audio.getStatus() !== 'playing' && audio.getCurrentUrl() === JUKEBOX_PRIMARY) {
      audio.play(JUKEBOX_FALLBACK, false);
    }
  }, delayMs);
}

/** 点击 Jukebox 卡片：正在播它 → 暂停；否则（重新）开播并带兜底 */
export async function toggleJukebox(): Promise<void> {
  const audio = await loadAudio();
  const cur = audio.getCurrentUrl();
  if (isJukeboxUrl(cur)) {
    audio.play(cur as string, false); // play() 对同一 URL 是「暂停 ⇄ 继续」语义
    return;
  }
  await startJukebox();
}
