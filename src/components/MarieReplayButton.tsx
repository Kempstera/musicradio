// 「🎂 再放一次」按钮 —— 只对**见过生日彩蛋的人**出现（她 / 或她展示给朋友看时）。
//
// 存在的理由（与原生控件的局限直接相关）：
//   把语言切换器的 value 设成「已经是」的那个值不会派发 change 事件，而 iOS/Safari 的
//   原生选择器根本不给 <option> 派发任何 DOM 事件。所以只要 Marie 已经在威尔士语页面，
//   她再点一次「Cymraeg」在 Web 上是检测不到的。
//   → 因此给她一个**永远可点、与切换器无关**的入口：点一次，整场庆祝从头重放一次
//     （停当前电台 → 生日序曲 → 红/绿/白烟花 + 金色文字 → 序曲结束自动切 1946 Jukebox）。
//
// 可见性需要同时满足两条（缺一不可）：
//   ① localStorage['mr_marie_seen'] —— 彩蛋被触发过（普通访客看不到，也就不会察觉有彩蛋）；
//   ② 当前语言是英语或威尔士语 —— 与「Marie's Jukebox 只在 en/cy 下出现」保持一致，
//      避免在别的语言界面里点开一个空落落的庆祝（Jukebox 不会渲染）。
import { useEffect, useState } from 'react';
import { isMarieKnown, isMarieLang, requestMarieReplay } from '../lib/marie';
import { getCurrentLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

export default function MarieReplayButton() {
  const [known, setKnown] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getCurrentLang());

  useEffect(() => {
    // 在 effect 里读 localStorage：避免 SSR 阶段访问浏览器 API，
    // 也天然规避「服务端渲染可见性 ≠ 客户端可见性」的 hydration 不一致。
    setKnown(isMarieKnown());
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  if (!known || !isMarieLang(lang)) return null;

  return (
    <button
      type="button"
      className="marie-replay"
      onClick={() => requestMarieReplay()}
      title="Penblwydd Hapus Marie! 🎂"
      aria-label="Penblwydd Hapus Marie — play the birthday surprise again"
    >
      <span className="marie-replay__cake" aria-hidden="true">🎂</span>
      <span className="marie-replay__text">Penblwydd Hapus</span>
    </button>
  );
}
