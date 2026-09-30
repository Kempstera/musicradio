import { useEffect, useState } from 'react';
import { getCurrentUrl, isPlaying, play, stop, subscribe } from '../lib/audio';
import { isFavorite, subscribe as subscribeFavs } from '../lib/favorites';
import FavoriteButton from './FavoriteButton';

export interface Station {
  id: string;
  name: string;
  url: string;
  hls: boolean;
  codec?: string;
  bitrate?: number;
  tags?: string;
  homepage?: string;
  /** 电台简介（精选电台的客观介绍，可选） */
  note?: string;
  /** note 在 notableRadios 中的原始下标（用于 content-blob 的多语言对齐） */
  noteIdx?: number;
  /** 采集电台简介的索引键（流地址 url，用于 station-notes-blob 的多语言对齐） */
  noteKey?: string;
}

interface Props {
  stations: Station[];
  countryName: string;
  flag?: string;
  /** 无在线流时的自定义说明 */
  emptyNote?: string;
  /** 国家 slug（用于无在线流提示的正文多语言切换） */
  slug?: string;
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

export default function RadioPlayer({ stations, countryName, flag, emptyNote, slug }: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [favTick, setFavTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setCurrentUrl(getCurrentUrl());
      setPlaying(isPlaying());
    };
    refresh();
    const unsub = subscribe(refresh);
    return unsub;
  }, []);

  useEffect(() => {
    const refresh = () => setFavTick((n) => n + 1);
    return subscribeFavs(refresh);
  }, []);

  // 收藏的电台排在最前（居于顶端）
  const ordered = [...stations].sort((a, b) => {
    const af = isFavorite(a.url) ? 1 : 0;
    const bf = isFavorite(b.url) ? 1 : 0;
    return bf - af;
  });
  void favTick;

  if (!stations.length) {
    return (
      <p className="empty" style={{ marginTop: '1.4rem' }} data-ct="radioNote" data-slug={slug} data-i18n="radioEmptyFallback">
        {emptyNote || '暂未收录该地区的在线电台流，敬请期待。'}
      </p>
    );
  }

  const current = stations.find((s) => s.url === currentUrl);

  return (
    <>
      <div className="radio-grid">
        {ordered.map((s) => {
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
                {s.note && (
                  <div
                    className="radio-card__note"
                    data-ct={s.noteKey ? 'r-snote' : 'r-note'}
                    data-idx={s.noteIdx ?? -1}
                    data-note-key={s.noteKey}
                    data-slug={slug}
                  >
                    {s.note}
                  </div>
                )}
              </div>
              <FavoriteButton
                station={{
                  url: s.url,
                  name: s.name,
                  genre: s.tags,
                  country: countryName,
                  countrySlug: slug,
                  hls: s.hls,
                }}
              />
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
