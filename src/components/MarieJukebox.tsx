// 「🎂 Marie's Jukebox」首页置顶区块。
//
// 仅在生日彩蛋被触发过（本次会话内）才渲染；国家详情页里的同名精选集由 RadioPlayer 注入。
// 首页本来没有「电台列表」，所以这里单独给一个置顶区块，保证用户在首页也能看到并点播它们。
//
// 内容 = MARIE_STATIONS：第 1 张是默认台（1940 年代老歌），其余 4 张是备选推荐。
//
// ⚠️ 包体约束：不静态 import `../lib/audio`（内含 hls.js 577KB）。只有在该区块真正出现后
// （即彩蛋已被触发），才惰性加载音频模块来订阅播放状态。
import { useEffect, useState } from 'react';
import {
  MARIE_STATIONS,
  isJukeboxActive,
  isMarieStationCurrent,
  marieBlurb,
  subscribe,
  toggleMarieStation,
  type MarieStation,
} from '../lib/marie';
import { getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

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
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());

  const isZh = lang.toLowerCase().startsWith('zh');

  useEffect(() => {
    const refresh = () => setActive(isJukeboxActive());
    refresh();
    return subscribe(refresh);
  }, []);

  useEffect(() => {
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let off: (() => void) | null = null;
    import('../lib/audio')
      .then((m) => {
        if (cancelled) return;
        const refresh = () => {
          setCurrentUrl(m.getCurrentUrl());
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

  return (
    <section className="section" id="marie-jukebox" style={{ paddingTop: '2.4rem', paddingBottom: '0.4rem' }}>
      <div className="container">
        <div className="section__head">
          <div>
            <div className="section__kicker">Happy 80th, Marie</div>
            <h2 className="section__title">🎂 Marie's Jukebox</h2>
          </div>
          <span style={{ color: 'var(--ink-faint)' }}>
            {MARIE_STATIONS.length} stations · {isZh ? '挑一个试试' : 'pick any one'}
          </span>
        </div>

        <p className="marie-intro">
          {isZh
            ? '除了默认的 1940 年代老歌台，这里还有另外几个为你挑的备选 —— 随便点开哪个都行。'
            : 'Besides the default 1940s jukebox, here are a few more I picked for you — tap whichever you like.'}
        </p>

        <div className="radio-grid">
          {MARIE_STATIONS.map((s: MarieStation) => {
            const isPrimary = s.id === MARIE_STATIONS[0].id;
            const playingNow = isMarieStationCurrent(s, currentUrl) && playing;
            return (
              <div
                key={s.id}
                className={`radio-card radio-card--marie${isPrimary ? '' : ' radio-card--marie-alt'}${
                  playingNow ? ' is-playing' : ''
                }`}
              >
                <button
                  className="radio-card__play"
                  onClick={() => void toggleMarieStation(s)}
                  aria-label={playingNow ? `暂停 ${s.name}` : `播放 ${s.name}`}
                  title={playingNow ? '暂停' : '播放'}
                >
                  {playingNow ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="radio-card__body">
                  <a
                    className="radio-card__name radio-card__name--link"
                    href={s.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${s.name} · 访问官网`}
                  >
                    {s.name}
                  </a>
                  <div className="radio-card__meta">
                    {playingNow ? (
                      <span className="radio-card__live">
                        <Eq /> 正在播放
                      </span>
                    ) : (
                      <span className="radio-card__live">LIVE</span>
                    )}
                    <span>{s.bitrate} kbps</span>
                    <span>{s.codec}</span>
                    {s.tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((t) => (
                        <span key={t} className="radio-tag">{t}</span>
                      ))}
                    {s.url.startsWith('http://') && (
                      <span className="radio-tag radio-tag--http" title="经本站边缘代理播放">
                        HTTP
                      </span>
                    )}
                  </div>
                  <div className="radio-card__blurb">{marieBlurb(s, lang)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
