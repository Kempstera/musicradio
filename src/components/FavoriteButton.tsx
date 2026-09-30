import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isFavorite, toggleFavorite, subscribe, initFavorites, type FavoriteStation } from '../lib/favorites';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

interface Props {
  station: FavoriteStation;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ station, size = 'md' }: Props) {
  const [fav, setFav] = useState<boolean>(() => isFavorite(station.url));
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());
  const t = getTranslation(lang);

  useEffect(() => {
    initFavorites();
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  useEffect(() => {
    const refresh = () => setFav(isFavorite(station.url));
    refresh();
    return subscribe(refresh);
  }, [station.url]);

  const onClick = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      window.dispatchEvent(new CustomEvent('open-auth'));
      return;
    }
    setBusy(true);
    try {
      await toggleFavorite(station);
    } finally {
      setBusy(false);
    }
  };

  const label = fav ? t.favRemove : t.favAdd;

  return (
    <button
      className={`fav-btn${fav ? ' is-fav' : ''}`}
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      aria-pressed={fav}
    >
      <svg width={size === 'sm' ? 15 : 17} height={size === 'sm' ? 15 : 17} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={fav ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}
