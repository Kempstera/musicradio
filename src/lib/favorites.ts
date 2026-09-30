// 收藏（点赞/My Favorites）全局状态管理器
// 登录用户 → Supabase favorites 表（跨设备）；未登录 → localStorage 兜底
import { supabase } from './supabase';

export interface FavoriteStation {
  url: string;
  name: string;
  genre?: string;
  country?: string;
  countrySlug?: string;
  hls?: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

// 内存状态：url -> 收藏信息（含 countrySlug 用于跳转国家页）
let favs = new Map<string, FavoriteStation>();
let userId: string | null = null;
let loaded = false;

const LS_KEY = 'mr:favorites';

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as FavoriteStation[];
    favs = new Map(arr.map((f) => [f.url, f]));
  } catch {
    /* ignore */
  }
}

function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...favs.values()]));
  } catch {
    /* ignore */
  }
}

/** 是否已收藏 */
export function isFavorite(url: string): boolean {
  return favs.has(url);
}

/** 收藏列表（按收藏时间倒序由调用方决定，这里保持插入序） */
export function listFavorites(): FavoriteStation[] {
  return [...favs.values()];
}

export function favoriteCount(): number {
  return favs.size;
}

/** 是否已从后端加载完成 */
export function isLoaded(): boolean {
  return loaded;
}

async function loadRemote(uid: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('station_url, station_name, station_genre, station_country, country_slug, hls')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    // 表可能未创建（用户尚未执行 SQL），静默降级到 localStorage
    return;
  }
  const remote = new Map<string, FavoriteStation>();
  for (const r of data || []) {
    remote.set(r.station_url, {
      url: r.station_url,
      name: r.station_name,
      genre: r.station_genre,
      country: r.station_country,
      countrySlug: r.country_slug,
      hls: r.hls,
    });
  }
  // 合并：localStorage 的匿名收藏也保留（用户可能在未登录时点过赞）
  const merged = new Map<string, FavoriteStation>();
  for (const f of favs.values()) merged.set(f.url, f);
  for (const f of remote.values()) merged.set(f.url, f);
  favs = merged;
  saveLocal();
}

/** 初始化：读 localStorage + 监听登录态，登录后拉取远端收藏（幂等） */
let initialized = false;
export function initFavorites(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  loadLocal();
  loaded = true;
  emit();

  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user ?? null;
    if (u) {
      userId = u.id;
      loadRemote(u.id).then(() => {
        loaded = true;
        emit();
      });
    }
  });

  supabase.auth.onAuthStateChange((_e, session) => {
    const u = session?.user ?? null;
    if (u && u.id !== userId) {
      userId = u.id;
      loadRemote(u.id).then(() => {
        loaded = true;
        emit();
      });
    } else if (!u && userId) {
      userId = null;
      loadLocal();
      emit();
    }
  });
}

/** 点赞 / 取消点赞，返回新的收藏状态 */
export async function toggleFavorite(station: FavoriteStation): Promise<boolean> {
  const had = favs.has(station.url);
  if (had) {
    favs.delete(station.url);
  } else {
    favs.set(station.url, station);
  }
  saveLocal();
  emit();

  // 登录后同步到 Supabase
  if (userId) {
    try {
      if (had) {
        await supabase.from('favorites').delete().eq('user_id', userId).eq('station_url', station.url);
      } else {
        await supabase.from('favorites').upsert(
          {
            user_id: userId,
            station_url: station.url,
            station_name: station.name,
            station_genre: station.genre || '',
            station_country: station.country || '',
            country_slug: station.countrySlug || '',
            hls: !!station.hls,
          },
          { onConflict: 'user_id,station_url' }
        );
      }
    } catch {
      /* 后端失败不阻断本地体验 */
    }
  }
  return !had;
}
