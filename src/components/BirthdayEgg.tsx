// 生日彩蛋 —— 当用户把语言切换为「威尔士语（Cymraeg）」时触发。
//   ① 立即停掉正在播放的电台，改播本地 1 分钟生日序曲（marie-birthday-song.mp3）
//   ② 红/绿/白（威尔士国旗三色）全屏烟花 + 电影感金色发光文字
//   ③ 序曲播完（onended）后自动切到「🎂 Marie's 1946 Jukebox」并开播
//   ④ 视觉特效持续 20 秒后优雅淡出并从 DOM 移除，序曲/电台继续在后台播放
//
// 触发信号（两者等价，且**都可以重复触发**）：
//   · LANG_USER_CHANGE_EVENT  —— 用户在语言切换器里选了 Cymraeg
//   · MARIE_REPLAY_EVENT      —— 页头的 🎂 按钮被点（见 MarieReplayButton.tsx）
//
// 「重复触发」为什么要支持：原生 <select> 在「选中的就是当前那一项」时不会派发 change，
// iOS/Safari 的原生选择器更是不给 <option> 派发任何 DOM 事件。所以只要 Marie 已经在
// 威尔士语页面，她再点一次「Cymraeg」在 Web 上是检测不到的。给她一个永远可点的 🎂 入口，
// 每次点击都把整场庆祝（音乐 + 烟花 + 文字）从头重放一遍。
//
// ⚠️ 包体约束：`../lib/audio` 内含 hls.js（577KB），**不能静态 import**，
// 否则会把整个分包塞进所有页面。故只在挂载后 800ms 空闲预热、并把模块引用缓存下来，
// 以便在用户手势的同步栈内直接调用 play。`../lib/marie` 是轻量模块（内部惰性加载音频），可静态引入。
import { useEffect, useRef, useState } from 'react';
import { LANG_USER_CHANGE_EVENT, readRecentUserLangChange } from '../lib/i18n';
import type { Lang } from '../lib/i18n';
import {
  BIRTHDAY_OVERTURE_SRC,
  MARIE_REPLAY_EVENT,
  activateJukebox,
  clearMarieReplay,
  readRecentMarieReplay,
  startJukebox,
} from '../lib/marie';

type ConfettiFn = typeof import('canvas-confetti');
type AudioMod = typeof import('../lib/audio');

// —— 参数 ————————————————————————————————————————————
const TRIGGER_LANG: Lang = 'cy'; // 仅威尔士语触发
const CELEBRATION_MS = 20_000; // 烟花 + 文字持续时长
const FADE_MS = 1400; // 淡出时长
const CONFETTI_Z = 1200; // 烟花画布层级（低于文字层，保证文字浮于烟花之上）

// 威尔士国旗三色：红 / 绿 / 白
const WELSH_COLORS = ['#D30731', '#00AB39', '#FFFFFF'];

// 20 秒「烟花」：左右错落地次第炸开，随机落点、随机时刻
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
  // 每轮庆祝递增一次，作为叠加层的 key —— 强制 React 重建节点，
  // 这样连点重播时入场动画（bd-egg-in）也会跟着从头播一遍
  const [runId, setRunId] = useState(0);

  const runningRef = useRef(false);
  const aliveRef = useRef(true);
  const audioRef = useRef<AudioMod | null>(null);
  const stopFireworksRef = useRef<(() => void) | null>(null);
  const confettiRef = useRef<ConfettiFn | null>(null);
  const timersRef = useRef<number[]>([]); // 模块预热等「一生只跑一次」的定时器
  const celebTimersRef = useRef<number[]>([]); // 单轮庆祝的定时器（重播时整组作废）
  const gestureRetryRef = useRef(false);
  const gestureCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    const clearTimers = () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      celebTimersRef.current.forEach((t) => window.clearTimeout(t));
      celebTimersRef.current = [];
    };

    // 预热音频模块：该模块含 hls.js（较重），故不静态引入、空闲时再静默加载。
    // 预热后即可在用户手势内「同步」调用 play()，稳妥通过浏览器自动播放策略。
    timersRef.current.push(
      window.setTimeout(() => {
        import('../lib/audio')
          .then((m) => {
            if (aliveRef.current) audioRef.current = m;
          })
          .catch(() => {});
      }, 800),
    );

    // 序曲播放结束 → 自动切到 1946 Jukebox
    const onOvertureEnd = () => {
      if (!aliveRef.current) return;
      void startJukebox();
    };

    // 自动播放被拦截（典型场景：用户在水合完成前就切了语言，手势已经过期）
    // → 挂一次性监听，在用户下一次交互的同步栈里补播
    const armGestureRetry = () => {
      if (gestureRetryRef.current) return;
      gestureRetryRef.current = true;

      const onGesture = () => {
        detach();
        if (!aliveRef.current) return;
        audioRef.current?.playOverture(BIRTHDAY_OVERTURE_SRC, onOvertureEnd).catch(() => {});
      };
      const detach = () => {
        window.removeEventListener('pointerdown', onGesture, true);
        window.removeEventListener('touchstart', onGesture, true);
        window.removeEventListener('keydown', onGesture, true);
        gestureRetryRef.current = false;
        gestureCleanupRef.current = null;
      };
      window.addEventListener('pointerdown', onGesture, true);
      window.addEventListener('touchstart', onGesture, true);
      window.addEventListener('keydown', onGesture, true);
      gestureCleanupRef.current = detach;
    };

    // ① 立即停掉正在播放的电台（playOverture 内部会销毁 hls 实例并接管 <audio>，
    //    且会把播放头复位到 0），改为播放本地生日序曲；播完由 onOvertureEnd 接手
    const startOverture = () => {
      const begin = (m: AudioMod) => {
        m.playOverture(BIRTHDAY_OVERTURE_SRC, onOvertureEnd).catch(armGestureRetry);
      };
      const mod = audioRef.current;
      if (mod) {
        begin(mod);
      } else {
        // 极端情况：预热尚未完成 → 模块加载后立刻播（仍处于浏览器瞬时激活窗口内）
        import('../lib/audio')
          .then((m) => {
            audioRef.current = m;
            if (aliveRef.current) begin(m);
          })
          .catch(() => {});
      }
    };

    /** 把上一轮庆祝整体复位（清定时器 / 停烟花 / 清画布 / 撤一次性手势监听） */
    const resetCelebration = () => {
      celebTimersRef.current.forEach((t) => window.clearTimeout(t));
      celebTimersRef.current = [];
      stopFireworksRef.current?.();
      stopFireworksRef.current = null;
      try {
        confettiRef.current?.reset();
      } catch {
        /* noop */
      }
      gestureCleanupRef.current?.();
      runningRef.current = false;
      setVisible(false);
      setClosing(false);
    };

    const trigger = () => {
      // 已在庆祝中（Marie 连点🎂 / 先切语言又点按钮）→ 先复位，保证「从头再激活一次」
      if (runningRef.current) resetCelebration();
      runningRef.current = true;

      // ① 立刻把「🎂 Marie's 1946 Jukebox」注入电台列表（会话级常驻）
      activateJukebox();

      // ② 停当前电台 → 播 1 分钟生日序曲（序曲结束后自动接 Jukebox）
      startOverture();

      // ③ 亮出电影感文字叠加（换 key 让入场动画重新播放）
      setClosing(false);
      setVisible(true);
      setRunId((n) => n + 1);

      // ④ 烟花：动态引入，正常访问页面时不会加载该库
      import('canvas-confetti')
        .then(({ default: confetti }) => {
          if (!aliveRef.current) return;
          confettiRef.current = confetti;
          stopFireworksRef.current = runFireworks(confetti);
        })
        .catch(() => {
          /* 烟花加载失败也不影响文字与音乐 */
        });

      // ⑤ 20 秒后优雅淡出，再从 DOM 移除（序曲 / 电台继续在后台播放）
      celebTimersRef.current.push(
        window.setTimeout(() => {
          setClosing(true);
          stopFireworksRef.current?.();
          stopFireworksRef.current = null;
          celebTimersRef.current.push(
            window.setTimeout(() => {
              setVisible(false);
              setClosing(false);
              runningRef.current = false;
            }, FADE_MS),
          );
        }, CELEBRATION_MS),
      );
    };

    const onUserLang = (e: Event) => {
      const lang = (e as CustomEvent<Lang>).detail;
      if (lang !== TRIGGER_LANG) return; // 仅切到威尔士语时触发
      trigger();
    };

    // 页头 🎂 按钮：与语言无关，点一次重放一次
    const onReplay = () => {
      clearMarieReplay();
      trigger();
    };

    window.addEventListener(LANG_USER_CHANGE_EVENT, onUserLang);
    window.addEventListener(MARIE_REPLAY_EVENT, onReplay);

    // 补触发：Astro 为每个 client:load 岛单独建 React root，各岛水合时序不一。
    // 若用户在「本岛挂载之前」就切了语言（或点了 🎂），事件早已派发完毕（监听器尚未挂上），
    // 此时依据记录在 window 上的线索补触发一次。
    const replayPending = readRecentMarieReplay();
    if (replayPending) clearMarieReplay();
    if (replayPending || readRecentUserLangChange() === TRIGGER_LANG) trigger();

    return () => {
      aliveRef.current = false;
      window.removeEventListener(LANG_USER_CHANGE_EVENT, onUserLang);
      window.removeEventListener(MARIE_REPLAY_EVENT, onReplay);
      gestureCleanupRef.current?.();
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
    <div key={runId} className={`bd-egg${closing ? ' bd-egg--out' : ''}`} aria-hidden="true">
      <div className="bd-egg__title">Penblwydd Hapus Marie! 🎂</div>
    </div>
  );
}
