import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  LANGS,
  DEFAULT_LANG,
  getTranslation,
  getInitialLang,
  saveLang,
  notifyUserLangChange,
} from '../lib/i18n';
import type { Lang } from '../lib/i18n';
import { applyLang } from '../lib/apply-lang';

// 文案应用逻辑已经搬到 lib/apply-lang.ts —— 它不再依赖 React 是否水合成功。

declare global {
  interface Window {
    /** 由 apply-lang 模块注册：把指定语言应用到页面（供水合前的原生监听器调用） */
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
    // （首次来访的默认语言界面 + 一次轻提示）。若在首访就写入 mr_lang，
    // 第二次打开任意页面就会被误判成「老访客」，标识与提示都会消失。
    applyLang(initial);
    window.__mrLangReady = true;
    window.__mrLangPending = undefined;

    // 兜底对齐：受控 <select> 在水合时可能被初始值残留干扰
    const sel = selectRef.current;
    if (sel && sel.value !== initial) sel.value = initial;

    // 若这次语言是用户在水合前主动切换的，补派发一次「用户主动切换」事件
    if (isLang(pending)) {
      const adopted: Lang = pending;
      window.setTimeout(() => notifyUserLangChange(adopted), 0);
    }

    // —— 一次性轻提示 ——
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

    // bfcache 恢复：React 不会重新水合，DOM 仍停在缓存时的语言，按存储值重放一次
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
        {/* 「语言可以切换」的视觉标识：只在从未选过语言的访客身上出现 */}
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
