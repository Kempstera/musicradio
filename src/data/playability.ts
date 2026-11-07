// 国家层面的「可播性」统计：一个国家有多少台在国内能直接打开
//
// 用途两处：
//   ① 大洲巡礼页里，同一子区域的国家排序（sortByPlayability）
//   ② 全站「可播 X 台 / 共 Y 台」的合计数字
//
// 排序口径（用户 2026-10 定）：大国在前，同档再按可播台数从多到少。
// 光按台数排的问题是位置随每次扩库漂移 —— 英国曾经因为荷兰多抓了几十台而掉到第二，
// 用户第一眼就找不到它。所以分量由 src/data/country-weight.ts 固定，数量只做次序。
//
// 可播台数的口径必须与 [slug].astro 的播放列表一致：
//   notableRadios 里有 url 的 + （非 notable-only 时）radios.json 里该国的采集台。

import { allCountries } from './index';
import radiosData from './radios.json';
import { healthOf } from '../lib/stream-health';
import { weightOf } from './country-weight';
import type { Country } from '../lib/country';

const radios = radiosData as unknown as Record<string, { url: string }[]>;

export interface Playability {
  /** 国内可直连的台数 */
  playable: number;
  /** 该国收录的可播台总数 */
  total: number;
}

/** 取出某国页面上会渲染的全部流地址（与播放列表同口径） */
export function stationUrlsOf(c: Country): string[] {
  const curated = (c.notableRadios || []).filter((r) => r.url).map((r) => r.url as string);
  const fetched = c.radioMode === 'notable-only' ? [] : (radios[c.iso] || []).map((s) => s.url);
  return [...curated, ...fetched];
}

const cache = new Map<string, Playability>();

export function playabilityOf(c: Country): Playability {
  const hit = cache.get(c.slug);
  if (hit) return hit;
  const urls = stationUrlsOf(c);
  let playable = 0;
  for (const u of urls) if (healthOf(u).tier === 0) playable++;
  const res = { playable, total: urls.length };
  cache.set(c.slug, res);
  return res;
}

/**
 * 同一子区域内排序：先看国家分量（大国在前），再看可播台数。
 * 两项都相同则保持数据源里的原顺序（stable），避免列表看起来像被打乱了。
 */
export function sortByPlayability<T extends Country>(list: T[]): T[] {
  return list
    .map((c, i) => ({ c, i, w: weightOf(c.iso), p: playabilityOf(c).playable }))
    .sort((a, b) => b.w - a.w || b.p - a.p || a.i - b.i)
    .map((x) => x.c);
}

/** 全站合计：国内可直连的台数 / 收录总数 */
export function globalPlayability(): Playability {
  let playable = 0;
  let total = 0;
  for (const c of allCountries) {
    const p = playabilityOf(c);
    playable += p.playable;
    total += p.total;
  }
  return { playable, total };
}
