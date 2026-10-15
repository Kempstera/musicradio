// 生日彩蛋 —— 当用户把语言切换为「威尔士语（Cymraeg）」时触发。
//   ① 红/绿/白（威尔士国旗三色）全屏烟花
//   ② 电影感、金色发光的文字叠加
//   ③ 自动播放威尔士电台 BBC Radio Cymru
// 烟花与文字持续 10 秒，随后优雅淡出并从 DOM 移除；电台继续在后台播放。
//
// 触发信号：LANG_USER_CHANGE_EVENT（仅「用户主动切换」时派发，不含初始化 / bfcache 恢复）。
import { useEffect, useRef, useState } from 'react';
import { LANG_USER_CHANGE_EVENT, readRecentUserLangChange } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

type ConfettiFn = typeof import('canvas-confetti');
type PlayFn = (url: string, hlsStream: boolean) => void;

// —— 参数 ————————————————————————————————————————————
const TRIGGER_LANG: Lang = 'cy'; // 仅威尔士语触发
const CELEBRATION_MS = 10_000; // 烟花 + 文字持续时长
const FADE_MS = 1400; // 淡出时长
const CONFETTI_Z = 1200; // 烟花画布层级（低于文字层，保证文字浮于烟花之上）

// 自动播放的威尔士电台：BBC Radio Cymru（威尔士语国家电台；HLS、CORS 开放、全球可播）
const WELSH_STATION_URL =
  'https://as-hls-ww-live.akamaized.net/pool_24792333/live/ww/bbc_radio_cymru/bbc_radio_cymru.isml/bbc_radio_cymru-audio%3d128000.norewind.m3u8';

// 威尔士国旗三色：红 / 绿 / 白
const WELSH_COLORS = ['#D30731', '#00AB39', '#FFFFFF'];

// 10 秒「烟花」：左右错落地次第炸开，随机落点、随机时刻
function runFireworks(confetti: ConfettiFn): () => void {
  const end = Date.now() + CELEBRATION_MS;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const base = {
    startVelocity: 34,
    spread: 360,
    ticks: 90,
    gravity: 0.9,
    scalar: 0.9,
    zIndex: CONFETTI_Z,
    colors: WELSH_COLORS,
  };

  const timer = window.setInterval(() => {
    const left = end - Date.now();
    if (left <= 0) {
      window.clearInterval(timer);
      return;
    }
    const particleCount = Math.max(20, Math.round(60 * (left / CELEBRATION_MS)));
    confetti({ ...base, particleCount, origin: { x: rand(0.12, 0.34), y: rand(0.02, 0.42) } });
    confetti({ ...base, particleCount, origin: { x: rand(0.66, 0.88), y: rand(0.02, 0.42) } });
  }, 300);

  // 只停止「继续生成」；已在空中的粒子自然落下，由库自行回收画布
  return () => window.clearInterval(timer);
}

export default function BirthdayEgg() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const runningRef = useRef(false);
  const aliveRef = useRef(true);
  const playRef = useRef<PlayFn | null>(null);
  const stopFireworksRef = useRef<(() => void) | null>(null);
  const confettiRef = useRef<ConfettiFn | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    aliveRef.current = true;
    const clearTimers = () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };

    // 预热音频模块：该模块含 hls.js（较重），故不静态引入、空闲时再静默加载。
    // 预热后即可在用户手势内「同步」调用 play()，稳妥通过浏览器自动播放策略。
    timersRef.current.push(
      window.setTimeout(() => {
        import('../lib/audio')
          .then((m) => {
            if (aliveRef.current) playRef.current = m.play;
          })
          .catch(() => {});
      }, 800),
    );

    const onUserLang = (e: Event) => {
      const lang = (e as CustomEvent<Lang>).detail;
      if (lang !== TRIGGER_LANG) return; // 仅切到威尔士语时触发
      trigger();
    };

    const trigger = () => {
      if (runningRef.current) return; // 正在庆祝，忽略重复触发
      runningRef.current = true;

      // ① 立即播放威尔士电台（同步调用栈，确保自动播放不被拦截）
      const warmed = playRef.current;
      if (warmed) {
        try {
          warmed(WELSH_STATION_URL, true);
        } catch {
          /* 播放失败不影响烟花与文字 */
        }
      } else {
        // 极端情况：预热尚未完成 → 加载后补播（仍在浏览器瞬时激活窗口内）
        import('../lib/audio')
          .then((m) => {
            try {
              m.play(WELSH_STATION_URL, true);
            } catch {
              /* noop */
            }
          })
          .catch(() => {});
      }

      // ② 亮出电影感文字叠加
      setClosing(false);
      setVisible(true);

      // ③ 烟花：动态引入，正常访问页面时不会加载该库
      import('canvas-confetti')
        .then(({ default: confetti }) => {
          if (!aliveRef.current) return;
          confettiRef.current = confetti;
          stopFireworksRef.current = runFireworks(confetti);
        })
        .catch(() => {
          /* 烟花加载失败也不影响文字与电台 */
        });

      // ④ 10 秒后优雅淡出，再从 DOM 移除
      timersRef.current.push(
        window.setTimeout(() => {
          setClosing(true);
          stopFireworksRef.current?.();
          stopFireworksRef.current = null;
          timersRef.current.push(
            window.setTimeout(() => {
              setVisible(false);
              setClosing(false);
              runningRef.current = false;
            }, FADE_MS),
          );
        }, CELEBRATION_MS),
      );
    };

    window.addEventListener(LANG_USER_CHANGE_EVENT, onUserLang);

    // 补触发：Astro 为每个 client:load 岛单独建 React root，各岛水合时序不一。
    // 若用户在本岛挂载之前就把语言切成了威尔士语，事件早已派发完毕（监听器尚未挂上），
    // 此时依据 i18n 记录在 window 上的「最近一次用户切换」补触发一次。
    if (readRecentUserLangChange() === TRIGGER_LANG) trigger();

    return () => {
      aliveRef.current = false;
      window.removeEventListener(LANG_USER_CHANGE_EVENT, onUserLang);
      clearTimers();
      stopFireworksRef.current?.();
      try {
        confettiRef.current?.reset();
      } catch {
        /* noop */
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`bd-egg${closing ? ' bd-egg--out' : ''}`} aria-hidden="true">
      <div className="bd-egg__title">Penblwydd Hapus Marie! 🎂</div>
    </div>
  );
}
