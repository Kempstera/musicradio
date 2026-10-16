// 「Marie 80 岁生日」彩蛋 —— 会话级状态 + 电台精选集定义。
//
// 三个概念分开：
//  1) **序曲**（BIRTHDAY_OVERTURE_SRC）：事件驱动。每次用户把语言切到威尔士语时都播一遍，
//     播完自动接上 Jukebox。时序逻辑在 BirthdayEgg.tsx。
//  2) **电台精选集**（MARIE_STATIONS）：会话级常驻。一旦激活，本次会话内**跨页面导航**
//     （本站是 MPA，每次跳转都是全新文档）依然出现在电台列表最顶部，直到关闭标签页。
//     用 sessionStorage 承载。
//  3) 第 1 个是默认台（1940 年代老歌），其余 5 个是给 Marie 的备选推荐，点哪个听哪个。
//     共 6 台 = 首页精选集「两行 × 每行三个」。
//
// ⚠️ 精选集**只在英语 / 威尔士语**下渲染（见 isMarieLang）：
// 其它语言下首页区块、国家页置顶卡片、页头 🎂 入口全部不出现。
//
// 注意：本模块**不静态 import** `./audio`（该模块含 577KB 的 hls.js）。
// 需要它的只有「真正开播」这一步，因此播放相关函数一律惰性加载，
// 这样任何只用到电台元信息 / 会话标志的组件（如首页的 MarieJukebox 岛）都不会拖带音频分包。
//
// 流的可用性（2026-10-16 逐条实测，见下表）：
//   ┌ 默认台 The UK 1940s Radio Station —— 官方流仅 http://，会被 HTTPS 页面按混合内容拦截，
//   │  故经本站 /api/stream 边缘代理播放（须在 functions/api/stream.js 白名单中登记）；
//   │  另备一路 https 流，主用流起不来时自动切换。
//   ├ Angel Radio (UK)   https://edge.clrmedia.co.uk/angel_hb            MP3 96
//   ├ Swing Street (US)  http://s6.voscast.com:11312/                    MP3 128（http → 白名单）
//   ├ FIP (FR)           https://icecast.radiofrance.fr/fip-midfi.mp3    MP3 128
//   ├ JAZZ24 (US)        https://knkx-live-a.edge.audiocdn.com/6285_256k AAC 256
//   └ Serenade Radio UK  http://4534.cloudrad.io:8284/                   MP3 192（http → 白名单）
export const BIRTHDAY_OVERTURE_SRC = '/marie-birthday-song.mp3';

export const MARIE_JUKEBOX_ID = 'marie-jukebox-1946';
export const MARIE_JUKEBOX_NAME = "🎂 Marie's 1946 Jukebox";

/** 默认台主用流：The UK 1940s Radio Station 官网公布的官方流（仅 http，128kbps MP3） */
export const JUKEBOX_PRIMARY = 'http://solid2.streamupsolutions.com:24929/stream';
/** 默认台备用流：同为英国 1940 年代老歌台（Pumpkin FM 1940s Radio），https 直连无需代理 */
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
  /** 一句话推荐语（英文，默认） */
  blurb: string;
  /** 一句话推荐语（简体中文；繁体沿用中文，其余语言回落到英文） */
  blurbZh: string;
}

/** 精选集：第 1 个是默认台，其余为用户为 Marie 挑的备选 */
export const MARIE_STATIONS: MarieStation[] = [
  {
    id: MARIE_JUKEBOX_ID,
    name: MARIE_JUKEBOX_NAME,
    url: JUKEBOX_PRIMARY,
    hls: false,
    codec: 'MP3',
    bitrate: 128,
    tags: 'UK,1940s,Oldies',
    homepage: 'https://www.1940sukradio.co.uk/',
    blurb: "The UK's 1940s Radio Station — big band, swing and wartime favourites, around the clock.",
    blurbZh: '英国 1940 年代老歌台 —— 大乐队、摇摆乐与战时金曲，全天不间断。',
  },
  {
    id: 'marie-angel-radio',
    name: 'Angel Radio',
    url: 'https://edge.clrmedia.co.uk/angel_hb',
    hls: false,
    codec: 'MP3',
    bitrate: 96,
    tags: 'UK,Nostalgia,Standards',
    homepage: 'https://www.angelradio.co.uk/',
    blurb: 'A British station made for listeners over 60 — gentle nostalgia, standards and memories.',
    blurbZh: '英国专为 60 岁以上听众而设 —— 温柔的怀旧金曲与岁月回忆。',
  },
  {
    id: 'marie-swing-street',
    name: 'Swing Street Radio',
    url: 'http://s6.voscast.com:11312/',
    hls: false,
    codec: 'MP3',
    bitrate: 128,
    tags: 'US,Swing,Big Band',
    homepage: 'https://www.swingstreetradio.org/',
    blurb: 'All swing, all the time — the golden age of big bands, from Goodman to Basie.',
    blurbZh: '从早到晚都是摇摆乐 —— 大乐队黄金年代，从 Goodman 到 Basie。',
  },
  {
    id: 'marie-fip',
    name: 'FIP',
    url: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
    hls: false,
    codec: 'MP3',
    bitrate: 128,
    tags: 'FR,Jazz,Eclectic',
    homepage: 'https://www.radiofrance.fr/fip',
    blurb: "France's cult eclectic station — jazz, soul, world music and chanson, no ads, no chatter.",
    blurbZh: '法国传奇的「杂食」电台 —— 爵士、灵魂乐、世界音乐与香颂，无广告、少口播。',
  },
  {
    id: 'marie-jazz24',
    name: 'JAZZ24',
    url: 'https://knkx-live-a.edge.audiocdn.com/6285_256k',
    hls: false,
    codec: 'AAC',
    bitrate: 256,
    tags: 'US,Jazz,Smooth',
    homepage: 'https://www.jazz24.org/',
    blurb: "From Seattle's KNKX — classic and contemporary jazz, twenty-four hours a day.",
    blurbZh: '来自西雅图 KNKX —— 经典与当代爵士，一天 24 小时不间断。',
  },
  {
    id: 'marie-serenade',
    name: 'Serenade Radio UK',
    url: 'http://4534.cloudrad.io:8284/',
    hls: false,
    codec: 'MP3',
    bitrate: 192,
    tags: 'UK,Easy Listening,Standards',
    homepage: 'https://www.serenade-radio.com/',
    blurb:
      'The best in easy listening — standards, big bands and crooners of the 40s, 50s and 60s, and not a single advert.',
    blurbZh: '英国轻松聆听名台 —— 40/50/60 年代的标准曲、大乐队与低吟歌手，全程无广告。',
  },
];

/** 默认台（精选集第一项），保留旧引用名 */
export const MARIE_JUKEBOX: MarieStation = MARIE_STATIONS[0];

/**
 * 生日精选集只在**英语与威尔士语**下出现。
 * 理由：这是一份写给 Marie 的、以英语命名的私人礼物，混在其它语言界面里既不协调也喧宾夺主。
 * 其它语言下整块内容（首页区块 / 国家页置顶卡片 / 页头 🎂 入口）一律不渲染。
 */
export function isMarieLang(lang: string): boolean {
  const l = (lang || '').toLowerCase();
  return l === 'en' || l === 'cy';
}

const MARIE_ID_SET = new Set(MARIE_STATIONS.map((s) => s.id));

/** 该 id 是否属于 Marie 精选集 */
export function isMarieId(id: string): boolean {
  return MARIE_ID_SET.has(id);
}

/** 按语言取推荐语：中文（简/繁）用 blurbZh，其余语言回落英文 */
export function marieBlurb(s: MarieStation, lang: string): string {
  return lang.toLowerCase().startsWith('zh') ? s.blurbZh || s.blurb : s.blurb;
}

/** 该 URL 是否正被这一张卡片播放（默认台要额外认它的备用流） */
export function isMarieStationCurrent(s: MarieStation, url: string | null): boolean {
  if (!url) return false;
  if (s.id === MARIE_JUKEBOX_ID) return url === JUKEBOX_PRIMARY || url === JUKEBOX_FALLBACK;
  return url === s.url;
}

/** 该 URL 是否属于精选集里的任意一台（含默认台的备用流） */
export function isJukeboxUrl(url: string | null): boolean {
  return url === JUKEBOX_PRIMARY || url === JUKEBOX_FALLBACK;
}

/** 该 URL 是否属于精选集里的任意一台（含默认台的备用流） */
export function isMarieUrl(url: string | null): boolean {
  if (!url) return false;
  return isJukeboxUrl(url) || MARIE_STATIONS.some((s) => s.url === url);
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

// —— 「她来过」的长期标记 ————————————————————————————————
// 只要彩蛋被触发过一次，就在 localStorage 里留一枚脚印。之后（跨会话、跨页面、
// 即使她后来把界面切回英语）她都能在页头看到一个 🎂 入口，一点即重放。
// 没触发过彩蛋的普通访客永远看不到这个按钮。
const SEEN_KEY = 'mr_marie_seen';

export function markMarieSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 隐私模式下可能不可写 */
  }
}

export function isMarieKnown(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function activateJukebox(): void {
  // 先落「她来过」的脚印，再判断是否需要注入电台列表。
  // 顺序很重要：同一会话内第二次触发彩蛋时 active 已为 true，若把 markMarieSeen()
  // 放在提前返回之后，就会漏记（曾导致「清掉 localStorage 后再触发，页头 🎂 按钮不出现」）。
  markMarieSeen();
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

// —— 「从头再来一次」：手动重播彩蛋 ————————————————————————
// 为什么需要它：把语言切换器的 value 设成「已经是」的那个值不会派发 change 事件，
// 而且 iOS/Safari 的原生选择器根本不给 <option> 派发任何 DOM 事件。
// 所以只要 Marie 已经在威尔士语页面，她再点一次「Cymraeg」是检测不到的。
// 结论：给她一个**永远可点**的入口（🎂 按钮），每次点击都把整场庆祝从头重放一遍。
export const MARIE_REPLAY_EVENT = 'mr:marie-replay';

declare global {
  interface Window {
    /** 最近一次「重放彩蛋」请求的时间戳（供水合较晚的岛补查） */
    __mrMarieReplayAt?: number;
  }
}

/** 请求把生日彩蛋从头重放一次（不论当前是否已在庆祝、不论当前语言） */
export function requestMarieReplay(): void {
  if (typeof window === 'undefined') return;
  window.__mrMarieReplayAt = Date.now();
  window.dispatchEvent(new Event(MARIE_REPLAY_EVENT));
}

/** 读取「刚刚是否有人请求重放彩蛋」（用于岛挂载晚于点击时的补触发） */
export function readRecentMarieReplay(maxAgeMs = 10000): boolean {
  if (typeof window === 'undefined') return false;
  const at = window.__mrMarieReplayAt;
  return typeof at === 'number' && Date.now() - at <= maxAgeMs;
}

/** 消费掉重放请求标记（避免同一请求被补触发两次） */
export function clearMarieReplay(): void {
  if (typeof window !== 'undefined') window.__mrMarieReplayAt = undefined;
}

// —— 播放控制（音频模块惰性加载）——————————————————————————
type AudioMod = typeof import('./audio');
let audioModPromise: Promise<AudioMod> | null = null;

function loadAudio(): Promise<AudioMod> {
  if (!audioModPromise) audioModPromise = import('./audio');
  return audioModPromise;
}

/**
 * 开播默认台：先走官方 http 流（经边缘代理），
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

/** 点击默认台卡片：正在播它 → 暂停；否则（重新）开播并带兜底 */
export async function toggleJukebox(): Promise<void> {
  const audio = await loadAudio();
  const cur = audio.getCurrentUrl();
  if (isJukeboxUrl(cur)) {
    audio.play(cur as string, false); // play() 对同一 URL 是「暂停 ⇄ 继续」语义
    return;
  }
  await startJukebox();
}

/**
 * 点击精选集里的任意一张卡片。
 * 默认台走带兜底的 startJukebox；其余备选台直接走统一的 play()
 * （http:// 的流由 audio.ts 自动改写为 /api/stream 同源代理）。
 */
export async function toggleMarieStation(s: MarieStation): Promise<void> {
  if (s.id === MARIE_JUKEBOX_ID) {
    await toggleJukebox();
    return;
  }
  const audio = await loadAudio();
  audio.play(s.url, s.hls);
}
