import { useEffect, useState, type ChangeEvent } from 'react';
import { LANGS, TRANSLATIONS, getInitialLang, saveLang } from '../lib/i18n';
import type { Lang, Translation } from '../lib/i18n';

// 将指定语言的文案应用到页面所有带 data-i18n 属性的元素上
function applyLang(lang: Lang) {
  const t: Translation = TRANSLATIONS[lang];
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && key in t) {
      el.textContent = (t as unknown as Record<string, string>)[key];
    }
  });
  // 更新 <title> 等 meta（若存在）
  const titleEl = document.querySelector('meta[property="og:locale"]');
  if (titleEl) titleEl.setAttribute('content', lang.replace('-', '_'));
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>('zh-CN');

  useEffect(() => {
    const initial = getInitialLang();
    setLang(initial);
    applyLang(initial);
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
