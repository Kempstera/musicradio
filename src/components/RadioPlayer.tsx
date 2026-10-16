import { useEffect, useState } from 'react';
import { getCurrentUrl, getStatus, isPlaying, play, retry, stop, subscribe, type PlaybackStatus } from '../lib/audio';
import { isFavorite, subscribe as subscribeFavs } from '../lib/favorites';
import { getTranslation, getInitialLang, LANG_CHANGE_EVENT } from '../lib/i18n';
import type { Lang } from '../lib/i18n';
import {
  MARIE_JUKEBOX_ID,
  MARIE_STATIONS,
  isJukeboxActive,
  isMarieId,
  isMarieLang,
  isMarieStationCurrent,
  marieBlurb,
  subscribe as subscribeMarie,
  toggleMarieStation,
  type MarieStation,
} from '../lib/marie';
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
  /** 一句话推荐语（仅生日彩蛋精选集使用，不参与 content-blob 多语言机制） */
  blurb?: string;
  /** note 在 notableRadios 中的原始下标（用于 content-blob 的多语言对齐） */
  noteIdx?: number;
  /** genre 在 notableRadios 中的原始下标（用于 content-blob 的多语言对齐） */
  genreIdx?: number;
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

// 正文多语言 blob（与服务端 <script id="content-blob"> 同源）：
// 精选电台的「流派」标签（如「古典 / 爵士」）是中文数据，静态 HTML 里给的是英语，
// 用户切到中文后需要再换回来 —— 复用同一份 blob 即可，无需额外的数据文件。
type ContentBlob = Record<string, Record<string, { radios?: { genre?: string; note?: string }[] }>>;
let cachedBlob: ContentBlob | null = null;

function readBlob(): ContentBlob | null {
  if (cachedBlob) return cachedBlob;
  // 服务端预渲染时没有 document：此时一律用静态值（已是英语），
  // 客户端水合后才会读 blob 做多语言切换。
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('content-blob');
  if (!el) return null;
  try {
    cachedBlob = JSON.parse(el.textContent || '{}') as ContentBlob;
  } catch {
    cachedBlob = null;
  }
  return cachedBlob;
}

/** 取某电台在指定语言下的流派文本；没有多语言数据时回退到静态值 */
function resolveGenre(lang: Lang, slug: string | undefined, s: Station): string | undefined {
  if (s.genreIdx === undefined || !slug) return s.tags;
  const v = readBlob()?.[lang]?.[slug]?.radios?.[s.genreIdx]?.genre;
  return v || s.tags;
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
  const [status, setStatus] = useState<PlaybackStatus>(() => getStatus());
  const [favTick, setFavTick] = useState(0);
  const [lang, setLang] = useState<Lang>(() => getInitialLang());
  // 生日彩蛋注入的「1946 Jukebox」是否已激活（会话级）
  const [jukeboxOn, setJukeboxOn] = useState(false);
  const t = getTranslation(lang);

  useEffect(() => {
    const refresh = () => {
      setCurrentUrl(getCurrentUrl());
      setPlaying(isPlaying());
      setStatus(getStatus());
    };
    refresh();
    const unsub = subscribe(refresh);
    return unsub;
  }, []);

  useEffect(() => {
    const refresh = () => setFavTick((n) => n + 1);
    return subscribeFavs(refresh);
  }, []);

  useEffect(() => {
    const onLang = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(LANG_CHANGE_EVENT, onLang);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, onLang);
  }, []);

  // 「1946 Jukebox」是会话级开关，激活后常驻于列表最顶部
  useEffect(() => {
    const refresh = () => setJukeboxOn(isJukeboxActive());
    refresh();
    return subscribeMarie(refresh);
  }, []);

  // 收藏的电台排在最前（居于顶端）
  const ordered = [...stations].sort((a, b) => {
    const af = isFavorite(a.url) ? 1 : 0;
    const bf = isFavorite(b.url) ? 1 : 0;
    return bf - af;
  });
  void favTick;

  // 生日彩蛋注入的精选集插在**最顶部**（不再参与收藏排序）：
  // 第 1 张是默认台，其余 5 张是给 Marie 的备选推荐。
  // 语言门控：只在英语 / 威尔士语下出现（与首页 MarieJukebox 区块一致）。
  const marieStations: Station[] = MARIE_STATIONS;
  const list: Station[] = jukeboxOn && isMarieLang(lang) ? [...marieStations, ...ordered] : ordered;

  if (!list.length) {
    return (
      <p className="empty" style={{ marginTop: '1.4rem' }} data-ct="radioNote" data-slug={slug} data-i18n="radioEmptyFallback">
        {emptyNote || t.radioEmptyFallback}
      </p>
    );
  }

  const isCurrentStation = (s: Station) =>
    isMarieId(s.id)
      ? isMarieStationCurrent(s as MarieStation, currentUrl)
      : s.url === currentUrl;

  const current = list.find(isCurrentStation);

  return (
    <>
      <div className="radio-grid">
        {list.map((s) => {
          const isMarie = isMarieId(s.id);
          // 精选集首张 = 默认台：保留金色呼吸光晕；其余备选卡用收敛版本，避免一屏多张同时发光
          const isMariePrimary = s.id === MARIE_JUKEBOX_ID;
          const isCurrent = isCurrentStation(s);
          const isPlayingNow = isCurrent && playing;
          const rawTags = resolveGenre(lang, slug, s) || '';
          const tags = rawTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3);
          return (
            <div
              key={s.id}
              className={`radio-card${isPlayingNow ? ' is-playing' : ''}${isMarie ? ' radio-card--marie' : ''}${
                isMarie && !isMariePrimary ? ' radio-card--marie-alt' : ''
              }`}
            >
              <button
                className="radio-card__play"
                onClick={() => (isMarie ? void toggleMarieStation(s as MarieStation) : play(s.url, s.hls))}
                aria-label={isPlayingNow ? `${t.radioPause} ${s.name}` : `${t.radioPlay} ${s.name}`}
                title={isPlayingNow ? t.radioPause : t.radioPlay}
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
                    title={`${s.name} · ${t.radioVisitSite}`}
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
                      <Eq /> {t.radioPlaying}
                    </span>
                  ) : (
                    <span className="radio-card__live">LIVE</span>
                  )}
                  {s.bitrate ? <span>{s.bitrate} kbps</span> : null}
                  {s.codec ? <span>{s.codec}</span> : null}
                  {tags.map((t) => (
                    <span key={t} className="radio-tag">{t}</span>
                  ))}
                  {s.url.startsWith('http://') && (
                    <span className="radio-tag radio-tag--http" title={t.httpTagHint}>HTTP</span>
                  )}
                </div>
                {isMarie && (
                  <div className="radio-card__blurb">{marieBlurb(s as MarieStation, lang)}</div>
                )}
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
                  genre: rawTags,
                  // 生日彩蛋注入的台不属于任何国家，避免被误标成当前国家
                  country: isMarie ? 'Marie · 80' : countryName,
                  countrySlug: isMarie ? undefined : slug,
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
            {status === 'error' ? (
              <div className="now-playing__status now-playing__status--lost">
                {t.streamLost}
                <button className="now-playing__retry" onClick={() => retry()} title={t.streamLostHint}>{t.streamRetry}</button>
              </div>
            ) : status === 'loading' || status === 'stalled' ? (
              <div className="now-playing__status">{t.streamConnecting}</div>
            ) : (
              <div className="now-playing__country">{countryName}</div>
            )}
          </div>
          <span className="now-playing__eq">
            <Eq />
          </span>
        </div>
      )}
    </>
  );
}
