import { useEffect, useState } from 'react';
import { getCurrentUrl, isPlaying, play, stop, subscribe } from '../lib/audio';

export interface Station {
  id: string;
  name: string;
  url: string;
  hls: boolean;
  codec?: string;
  bitrate?: number;
  tags?: string;
  homepage?: string;
}

interface Props {
  stations: Station[];
  countryName: string;
  flag?: string;
  /** 无在线流时的自定义说明 */
  emptyNote?: string;
}

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

export default function RadioPlayer({ stations, countryName, flag, emptyNote }: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);

  useEffect(() => {
    const refresh = () => {
      setCurrentUrl(getCurrentUrl());
      setPlaying(isPlaying());
    };
    refresh();
    const unsub = subscribe(refresh);
    return unsub;
  }, []);

  if (!stations.length) {
    return (
      <p className="empty" style={{ marginTop: '1.4rem' }}>
        {emptyNote || '暂未收录该地区的在线电台流，敬请期待。'}
      </p>
    );
  }

  const current = stations.find((s) => s.url === currentUrl);

  return (
    <>
      <div className="radio-grid">
        {stations.map((s) => {
          const isCurrent = s.url === currentUrl;
          const isPlayingNow = isCurrent && playing;
          const tags = (s.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3);
          return (
            <div key={s.id} className={`radio-card${isPlayingNow ? ' is-playing' : ''}`}>
              <button
                className="radio-card__play"
                onClick={() => play(s.url, s.hls)}
                aria-label={isPlayingNow ? `暂停 ${s.name}` : `播放 ${s.name}`}
                title={isPlayingNow ? '暂停' : '播放'}
              >
                {isPlayingNow ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="radio-card__body">
                {s.homepage ? (
                  <a
                    className="radio-card__name radio-card__name--link"
                    href={s.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${s.name} · 访问官网`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.name}
                  </a>
                ) : (
                  <div className="radio-card__name" title={s.name}>
                    {s.name}
                  </div>
                )}
                <div className="radio-card__meta">
                  {isPlayingNow ? (
                    <span className="radio-card__live">
                      <Eq /> 正在播放
                    </span>
                  ) : (
                    <span className="radio-card__live">LIVE</span>
                  )}
                  {s.bitrate ? <span>{s.bitrate} kbps</span> : null}
                  {s.codec ? <span>{s.codec}</span> : null}
                  {tags.map((t) => (
                    <span key={t} className="radio-tag">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {current && (
        <div className="now-playing" role="status">
          <button className="now-playing__btn" onClick={() => stop()} aria-label="停止播放">
            <PauseIcon />
          </button>
          <div className="now-playing__info">
            <div className="now-playing__name">{flag} {current.name}</div>
            <div className="now-playing__country">{countryName}</div>
          </div>
          <span className="now-playing__eq">
            <Eq />
          </span>
        </div>
      )}
    </>
  );
}
