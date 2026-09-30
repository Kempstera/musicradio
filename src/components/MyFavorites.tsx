import { useEffect, useState } from 'react';
import { listFavorites, subscribe, toggleFavorite, initFavorites, favoriteCount, type FavoriteStation } from '../lib/favorites';
import { getCurrentUrl, isPlaying, play, stop, subscribe as subscribeAudio } from '../lib/audio';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function MyFavorites() {
  const [favs, setFavs] = useState<FavoriteStation[]>(() => listFavorites());
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());
  const t = getTranslation(lang);

  useEffect(() => {
    initFavorites();
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  useEffect(() => {
    const refresh = () => setFavs(listFavorites());
    refresh();
    return subscribe(refresh);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setCurrentUrl(getCurrentUrl());
      setPlaying(isPlaying());
    };
    refresh();
    return subscribeAudio(refresh);
  }, []);

  if (favs.length === 0) return null;

  return (
    <section className="section" id="favorites" style={{ paddingTop: '2.4rem', paddingBottom: '0.4rem' }}>
      <div className="container">
        <div className="section__head">
          <div>
            <div className="section__kicker" data-i18n="favKicker">My Favorites</div>
            <h2 className="section__title" data-i18n="favTitle">我的最爱</h2>
          </div>
          <span style={{ color: 'var(--ink-faint)' }}>
            {favs.length} <span data-i18n="favCountUnit">个电台</span>
          </span>
        </div>
        <div className="fav-list">
          {favs.map((f) => {
            const isCurrent = f.url === currentUrl;
            const isPlayingNow = isCurrent && playing;
            return (
              <div key={f.url} className={`fav-item${isPlayingNow ? ' is-playing' : ''}`}>
                <button
                  className="fav-item__play"
                  onClick={() => play(f.url, !!f.hls)}
                  aria-label={isPlayingNow ? `暂停 ${f.name}` : `播放 ${f.name}`}
                  title={isPlayingNow ? '暂停' : '播放'}
                >
                  {isPlayingNow ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <rect x="6" y="5" width="4" height="14" rx="1.2" />
                      <rect x="14" y="5" width="4" height="14" rx="1.2" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14Z" />
                    </svg>
                  )}
                </button>
                <div className="fav-item__body">
                  <div className="fav-item__name" title={f.name}>{f.name}</div>
                  {f.country && (
                    <div className="fav-item__country">
                      {f.countrySlug ? (
                        <a href={`/countries/${f.countrySlug}`}>{f.country}</a>
                      ) : (
                        <span>{f.country}</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="fav-item__remove"
                  onClick={() => toggleFavorite(f)}
                  aria-label={t.favRemove}
                  title={t.favRemove}
                >
                  <HeartIcon filled />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
