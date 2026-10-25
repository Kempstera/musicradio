import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  LANGS,
  TRANSLATIONS,
  CONTINENT_LABELS,
  SUBREGION_LABELS,
  DEFAULT_LANG,
  getTranslation,
  getInitialLang,
  saveLang,
  LANG_CHANGE_EVENT,
  notifyUserLangChange,
} from '../lib/i18n';
import type { Lang, Translation } from '../lib/i18n';

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

// 将指定语言的文案应用到页面所有带 data-i18n 属性的元素上
function applyUI(lang: Lang) {
  const t: Translation = TRANSLATIONS[lang];
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
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
  // 更新 og:locale（若存在）
  const localeEl = document.querySelector('meta[property="og:locale"]');
  if (localeEl) localeEl.setAttribute('content', lang.replace('-', '_'));
}

function applyLabels(lang: Lang) {
  document.querySelectorAll<HTMLElement>('[data-continent]').forEach((el) => {
    const id = el.getAttribute('data-continent');
    if (id) {
      const label = (CONTINENT_LABELS[lang] as Record<string, string>)?.[id];
      if (label) el.textContent = label;
    }
  });
  document.querySelectorAll<HTMLElement>('[data-subregion]').forEach((el) => {
    const id = el.getAttribute('data-subregion');
    if (id) {
      const label = (SUBREGION_LABELS[lang] as Record<string, string>)?.[id];
      if (label) el.textContent = label;
    }
  });
  document.querySelectorAll<HTMLElement>('[data-hide-langs]').forEach((el) => {
    const list = (el.getAttribute('data-hide-langs') || '').split(',').map((s) => s.trim());
    el.style.display = list.includes(lang) ? 'none' : '';
  });
  // 地理类字段（首都 / 语言名）：源数据是中文，静态 HTML 用英语预渲染，
  // 这里在「中文界面 ⇄ 其它界面」之间来回切（对照表见 data/i18n/geo-en.ts）
  const zhMode = lang === 'zh-CN' || lang === 'zh-TW';
  document.querySelectorAll<HTMLElement>('[data-geo-zh]').forEach((el) => {
    const v = zhMode ? el.getAttribute('data-geo-zh') : el.getAttribute('data-geo-en');
    if (v) el.textContent = v;
  });
}

function applyContent(lang: Lang) {
  const blob = readBlob();
  const snote = readStationNotesBlob();
  if (!blob && !snote) return;
  document.querySelectorAll<HTMLElement>('[data-ct]').forEach((el) => {
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

function applyLang(lang: Lang) {
  applyUI(lang);
  applyLabels(lang);
  applyContent(lang);
  // 通知 React 岛组件（AuthWidget/MessageBoard/VisitorCounter）同步切换文案
  window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: lang }));
}

// —— 水合竞速防护 ——————————————————————————————————————
// Base.astro 的 <head> 里有一个原生 change 监听器：在 React 尚未水合时，
// 若用户已在语言切换器里做出选择，它会先把选择写入 localStorage 并暂存到
// window.__mrLangPending。这里把 applyLang 提前暴露出去，让「JS 包已加载、
// 但 React 还没水合」的窗口内也能立刻把语言应用上去。
declare global {
  interface Window {
    /** 由本模块注册：把指定语言应用到页面（供水合前的原生监听器调用） */
    __mrApplyLang?: (lang: Lang) => void;
    /** 水合前用户在切换器里的选择（暂存，水合时被采纳后清空） */
    __mrLangPending?: string;
    /** 标记 LanguageSwitcher 已水合就绪 */
    __mrLangReady?: boolean;
  }
}

function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGS.some((l) => l.id === v);
}

// —— 一次性「语言可切换」轻提示 ————————————————————————————
const TIP_KEY = 'mr_lang_hint';
const TIP_DELAY_MS = 1600; // 等首屏稳定后再出现，避免和首屏渲染抢注意力
const TIP_MS = 9000; // 停留时长

if (typeof window !== 'undefined') {
  window.__mrApplyLang = (l: Lang) => {
    if (isLang(l)) applyLang(l);
  };
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  // 一次性「语言可切换」轻提示：只对没提示过的访客展示一次
  const [tipOn, setTipOn] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // 水合时「采纳」用户在 React 就绪之前的操作：原生监听器已把它落盘到
    // localStorage 并暂存于 __mrLangPending —— 这里优先采用，避免被初始 state 回滚。
    const pending = window.__mrLangPending;

    const initial = isLang(pending) ? pending : getInitialLang();
    setLang(initial);
    // ⚠️ 这里**故意不调 saveLang(initial)**：
    // 只有「用户主动选过语言」才把 mr_lang 落盘。落盘与否同时是「这位访客是否用过语言
    // 切换器」的判据 —— Base.astro 的 <head> 脚本据此决定要不要显示「可切换」呼吸标识
    // （首次来访的英语界面 + 一次轻提示）。若在首访就写入 mr_lang='en'，
    // 第二次打开任意页面就会被误判成「老访客」，标识与提示都会消失。
    // 用户主动切换的路径在 onChange 里落盘（水合前的那次则由 <head> 的原生监听器落盘）。
    applyLang(initial);
    window.__mrLangReady = true;
    window.__mrLangPending = undefined;

    // 兜底对齐：受控 <select> 在水合时可能被初始值残留干扰，此处强制让
    // 下拉框显示的语言与「已生效语言」保持一致
    const sel = selectRef.current;
    if (sel && sel.value !== initial) sel.value = initial;

    // 若这次语言是用户在水合前主动切换的，补派发一次「用户主动切换」事件
    // （生日彩蛋等依赖该语义；用宏任务延后到其它岛的水合副作用挂载完毕之后。
    //   同时 i18n 会把这次动作记在 window 上，供更晚挂载的岛在 mount 时补查。）
    if (isLang(pending)) {
      const adopted: Lang = pending;
      window.setTimeout(() => notifyUserLangChange(adopted), 0);
    }

    // —— 一次性轻提示 ——
    // 目的：让「语言可以切换」这件事被看见（默认界面是英语，很多人不会去找切换器）。
    // 只提示一次（localStorage 记住），9 秒后自动收起，点击提示条也会立即收起。
    let tipShowTimer = 0;
    let tipHideTimer = 0;
    try {
      if (window.localStorage.getItem(TIP_KEY) !== '1') {
        tipShowTimer = window.setTimeout(() => {
          window.localStorage.setItem(TIP_KEY, '1');
          setTipOn(true);
          tipHideTimer = window.setTimeout(() => setTipOn(false), TIP_MS);
        }, TIP_DELAY_MS);
      }
    } catch {
      /* 隐私模式：静默跳过 */
    }

    // 处理浏览器「后退/前进」从 bfcache（往返缓存）恢复页面的情况：
    // 此时 React 不会重新水合、useEffect 不再执行，DOM 仍停留在缓存时的语言，
    // 但 localStorage 可能已变化 —— 需按当前存储值重新应用语言。
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const cur = getInitialLang();
        setLang(cur);
        applyLang(cur);
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => {
      window.removeEventListener('pageshow', onShow);
      window.clearTimeout(tipShowTimer);
      window.clearTimeout(tipHideTimer);
    };
  }, []);

  // 用户一旦真的换过语言，「切换器可点」这件事就已经达成，撤掉呼吸标识。
  // （Base.astro 的原生捕获监听器也会做同样的事 —— 这里只是补齐 React 侧，
  //   且只在真正发生 change 时才撤，单纯的「点开看看」不会把标识弄丢。）
  const markUsed = () => {
    document.documentElement.classList.remove('mr-lang-fresh');
  };

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Lang;
    setLang(next);
    saveLang(next);
    applyLang(next);
    markUsed();
    setTipOn(false);
    // 仅此路径属于「用户主动切换」：记录并派发专用事件（供生日彩蛋等使用）
    notifyUserLangChange(next);
  };

  return (
    <span className="lang-switcher-wrap">
      <label className="lang-switcher" title="Language">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
        </svg>
        <select
          ref={selectRef}
          value={lang}
          onChange={onChange}
          aria-label="Choose language / 选择语言"
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        {/* 「语言可以切换」的视觉标识：只在从未选过语言的访客身上出现，
            由 <html class="mr-lang-fresh"> 控制，避免 React 水合带来的闪烁 */}
        <span className="lang-switcher__dot" aria-hidden="true" />
      </label>

      {tipOn && (
        <span className="lang-switcher__tip" role="note" onClick={() => setTipOn(false)}>
          <span className="lang-switcher__tip-arrow" aria-hidden="true" />
          {getTranslation(lang).langHint}
        </span>
      )}
    </span>
  );
}
