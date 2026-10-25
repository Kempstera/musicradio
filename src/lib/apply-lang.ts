// 把「当前语言」应用到页面上的一切文案。
//
// 为什么单独成一个模块、而不是留在 LanguageSwitcher 里：
// 这段逻辑以前挂在 React 岛的 useEffect 上 —— 也就是说，**必须等 React 水合完**
// 页面才会变语言。水合慢一点，用户就先看到一整页英文；水合失败（脚本报错、
// 网络被墙、老浏览器），页面就永远停在英文。用户看到的就是「我明明选了中文，
// 界面却是英文」。
//
// 现在它是一段独立的普通模块：页面解析完就跑，不等任何 React；岛只是它的另一个
// 调用方。于是「选什么语言，界面就是那个语言」不再依赖 React 是否成功运行。
import {
  TRANSLATIONS,
  CONTINENT_LABELS,
  SUBREGION_LABELS,
  LANG_CHANGE_EVENT,
  getInitialLang,
} from './i18n';
import type { Lang, Translation } from './i18n';

// 正文内容 blob：{ lang: { slug: { 字段 } } }
interface ContentNode {
  name?: string;
  intro?: string;
  history?: string[];
  music?: string[];
  musicians?: { name: string; role: string; desc: string }[];
  radios?: { name: string; genre: string; note: string }[];
  radioNote?: string;
}
type ContentBlob = Record<string, Record<string, ContentNode>>;

let cachedBlob: ContentBlob | null = null;
let cachedSnote: Record<string, Record<string, string>> | null = null;

function readBlob(): ContentBlob | null {
  if (cachedBlob) return cachedBlob;
  const el = document.getElementById('content-blob');
  if (!el) return null;
  try {
    cachedBlob = JSON.parse(el.textContent || '{}');
  } catch {
    cachedBlob = null;
  }
  return cachedBlob;
}

function readStationNotesBlob(): Record<string, Record<string, string>> | null {
  if (cachedSnote) return cachedSnote;
  const el = document.getElementById('station-notes-blob');
  if (!el) return null;
  try {
    cachedSnote = JSON.parse(el.textContent || '{}');
  } catch {
    cachedSnote = null;
  }
  return cachedSnote;
}

/** 根据 data-ct 字段取某语言下的内容值 */
function resolveContent(blob: ContentBlob, lang: Lang, slug: string, ct: string, idx: number): string | undefined {
  const c = blob[lang]?.[slug];
  if (!c) return undefined;
  switch (ct) {
    case 'name':
      return c.name;
    case 'intro':
      return c.intro;
    case 'history':
      return c.history?.[idx];
    case 'music':
      return c.music?.[idx];
    case 'm-name':
      return c.musicians?.[idx]?.name;
    case 'm-role':
      return c.musicians?.[idx]?.role;
    case 'm-desc':
      return c.musicians?.[idx]?.desc;
    case 'r-genre':
      return c.radios?.[idx]?.genre;
    case 'r-note':
      return c.radios?.[idx]?.note;
    case 'radioNote':
      return c.radioNote;
    default:
      return undefined;
  }
}

/** 首轮应用（页面刚解析完、React 还没水合）时跳过岛的内容：
 *  岛内的 DOM 由 React 掌管，提前改文本会造成水合不匹配。岛自己会在挂载后
 *  用 getInitialLang() 渲染正确语言，不需要我们插手。 */
interface ApplyOptions {
  skipIslands?: boolean;
}

function each(sel: string, opt: ApplyOptions, fn: (el: HTMLElement) => void) {
  document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    if (opt.skipIslands && el.closest('astro-island')) return;
    fn(el);
  });
}

/** 把文案应用到所有带 data-i18n 的元素上 */
export function applyUI(lang: Lang, opt: ApplyOptions = {}) {
  const t: Translation = TRANSLATIONS[lang];
  document.documentElement.setAttribute('lang', lang);
  each('[data-i18n]', opt, (el) => {
    const key = el.getAttribute('data-i18n');
    if (!key || !(key in t)) return;
    const v = (t as unknown as Record<string, string>)[key];
    // 输入框没有「文本内容」可言，同样的键要落到 placeholder 上
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.placeholder = v;
    } else {
      el.textContent = v;
    }
  });
  const localeEl = document.querySelector('meta[property="og:locale"]');
  if (localeEl) localeEl.setAttribute('content', lang.replace('-', '_'));
}

/** 大洲 / 子区域 / 地域字段 */
export function applyLabels(lang: Lang, opt: ApplyOptions = {}) {
  each('[data-continent]', opt, (el) => {
    const id = el.getAttribute('data-continent');
    if (id) {
      const label = (CONTINENT_LABELS[lang] as Record<string, string>)?.[id];
      if (label) el.textContent = label;
    }
  });
  each('[data-subregion]', opt, (el) => {
    const id = el.getAttribute('data-subregion');
    if (id) {
      const label = (SUBREGION_LABELS[lang] as Record<string, string>)?.[id];
      if (label) el.textContent = label;
    }
  });
  each('[data-hide-langs]', opt, (el) => {
    const list = (el.getAttribute('data-hide-langs') || '').split(',').map((s) => s.trim());
    el.style.display = list.includes(lang) ? 'none' : '';
  });
  // 地理类字段（首都 / 语言名）：源数据是中文，静态 HTML 用英语预渲染
  const zhMode = lang === 'zh-CN' || lang === 'zh-TW';
  each('[data-geo-zh]', opt, (el) => {
    const v = zhMode ? el.getAttribute('data-geo-zh') : el.getAttribute('data-geo-en');
    if (v) el.textContent = v;
  });
}

/** 国家正文（简介 / 历史 / 音乐家 / 电台注） */
export function applyContent(lang: Lang, opt: ApplyOptions = {}) {
  const blob = readBlob();
  const snote = readStationNotesBlob();
  if (!blob && !snote) return;
  each('[data-ct]', opt, (el) => {
    const ct = el.getAttribute('data-ct');
    if (!ct) return;
    let val: string | undefined;
    if (ct === 'r-snote') {
      const key = el.getAttribute('data-note-key') || '';
      val = snote?.[lang]?.[key];
    } else {
      const slug = el.getAttribute('data-slug');
      const idx = parseInt(el.getAttribute('data-idx') || '0', 10);
      if (!slug || !blob) return;
      val = resolveContent(blob, lang, slug, ct, idx);
    }
    if (val !== undefined && val !== '') {
      el.textContent = val;
    }
  });
}

/** 一处入口：UI 骨架 + 标签 + 正文，最后通知 React 岛 */
export function applyLang(lang: Lang, opt: ApplyOptions = {}) {
  applyUI(lang, opt);
  applyLabels(lang, opt);
  applyContent(lang, opt);

  // 首绘遮罩：见 Base.astro —— 语言一旦落地就撤掉，让页面淡入
  document.documentElement.classList.remove('mr-i18n-pending');
  const w = window as unknown as { __mrI18nTimer?: number };
  if (w.__mrI18nTimer) {
    window.clearTimeout(w.__mrI18nTimer);
    w.__mrI18nTimer = 0;
  }

  // 通知 React 岛（收藏 / 留言板 / 账户 / 播放器等）同步切换文案
  window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }));
}

/** 读当前语言并应用（页面一解析完就调用） */
export function applySavedLang(): Lang {
  const lang = getInitialLang();
  applyLang(lang, { skipIslands: true });
  return lang;
}

// 供水合前的原生监听器调用
if (typeof window !== 'undefined') {
  (window as unknown as { __mrApplyLang?: (l: Lang) => void }).__mrApplyLang = (l: Lang) => applyLang(l);
}

/** 取某国在当前语言下的名字（收藏列表里存的是点收藏那一刻的语言） */
export function localizedCountryName(lang: Lang, slug: string | undefined, fallback: string): string {
  if (!slug) return fallback;
  const blob = readBlob();
  return blob?.[lang]?.[slug]?.name || fallback;
}
