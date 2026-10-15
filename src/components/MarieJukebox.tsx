// 「🎂 Marie's 1946 Jukebox」首页置顶区块。
//
// 仅在生日彩蛋被触发过（本次会话内）才渲染；国家详情页里的同名电台卡由 RadioPlayer 注入。
// 首页本来没有「电台列表」，所以这里单独给一个置顶区块，保证用户在首页也能看到并控制它。
//
// ⚠️ 包体约束：不静态 import `../lib/audio`（内含 hls.js 577KB）。只有在该区块真正出现后
// （即彩蛋已被触发），才惰性加载音频模块来订阅播放状态。
import { useEffect, useState } from 'react';
import { MARIE_JUKEBOX, isJukeboxActive, isJukeboxUrl, subscribe, toggleJukebox } from '../lib/marie';

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}
function Eq() {
  return (
    <span className="eq" aria-hidden>
      <span /><span /><span /><span />
    </span>
  );
}

export default function MarieJukebox() {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isCurrent, setIsCurrent] = useState(false);

  useEffect(() => {
    const refresh = () => setActive(isJukeboxActive());
    refresh();
    return subscribe(refresh);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let off: (() => void) | null = null;
    import('../lib/audio')
      .then((m) => {
        if (cancelled) return;
        const refresh = () => {
          setIsCurrent(isJukeboxUrl(m.getCurrentUrl()));
          setPlaying(m.isPlaying());
        };
        refresh();
        off = m.subscribe(refresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      off?.();
    };
  }, [active]);

  if (!active) return null;

  const playingNow = isCurrent && playing;

  return (
    <section className="section" id="marie-jukebox" style={{ paddingTop: '2.4rem', paddingBottom: '0.4rem' }}>
      <div className="container">
        <div className="section__head">
          <div>
            <div className="section__kicker">Happy 80th, Marie</div>
            <h2 className="section__title">{MARIE_JUKEBOX.name}</h2>
          </div>
          <span style={{ color: 'var(--ink-faint)' }}>UK 1940s · MP3 128k</span>
        </div>
        <div className="radio-grid">
          <div className={`radio-card radio-card--marie${playingNow ? ' is-playing' : ''}`}>
            <button
              className="radio-card__play"
              onClick={() => void toggleJukebox()}
              aria-label={playingNow ? `暂停 ${MARIE_JUKEBOX.name}` : `播放 ${MARIE_JUKEBOX.name}`}
              title={playingNow ? '暂停' : '播放'}
            >
              {playingNow ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="radio-card__body">
              <a
                className="radio-card__name radio-card__name--link"
                href={MARIE_JUKEBOX.homepage}
                target="_blank"
                rel="noopener noreferrer"
                title={`${MARIE_JUKEBOX.name} · 访问官网`}
              >
                {MARIE_JUKEBOX.name}
              </a>
              <div className="radio-card__meta">
                {playingNow ? (
                  <span className="radio-card__live">
                    <Eq /> 正在播放
                  </span>
                ) : (
                  <span className="radio-card__live">LIVE</span>
                )}
                <span>{MARIE_JUKEBOX.bitrate} kbps</span>
                <span>{MARIE_JUKEBOX.codec}</span>
                <span className="radio-tag">{MARIE_JUKEBOX.tags.split(',')[0]}</span>
                <span className="radio-tag radio-tag--http" title="经本站边缘代理播放">
                  HTTP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
