import { useEffect, useState, type ChangeEvent } from 'react';
import {
  LANGS,
  TRANSLATIONS,
  CONTINENT_LABELS,
  SUBREGION_LABELS,
  getInitialLang,
  saveLang,
  LANG_CHANGE_EVENT,
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
    if (key && key in t) {
      el.textContent = (t as unknown as Record<string, string>)[key];
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

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('zh-CN');

  useEffect(() => {
    const initial = getInitialLang();
    setLang(initial);
    applyLang(initial);

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
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Lang;
    setLang(next);
    saveLang(next);
    applyLang(next);
  };

  return (
    <label className="lang-switcher" title="语言 / Language">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </svg>
      <select value={lang} onChange={onChange} aria-label="选择语言 / Choose language">
        {LANGS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
