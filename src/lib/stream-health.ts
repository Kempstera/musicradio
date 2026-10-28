// 电波体检表 —— 每个流地址在国内网络下的实测结果
//
// 数据来源：2026-10-28 用 1481 个流地址做过两轮实测
//   ① 直连（中国大陆网络，无代理）→ 记录 HTTP 状态与首字节延迟（TTFB）
//   ② 失败项再走海外代理复测 → 区分「国内不通但海外正常（被墙/区域限制）」与「彻底死链」
//
// 分级：
//   0 = 国内直连可播（ms 为首字节延迟，越小越顺）
//   1 = 国内不通（海外可播，或从未测过的地址 —— 保守归此类）
//   2 = 死链（海外也打不开）
//
// 排序策略：先按分级，再按延迟；精选（notable）台享 1.2 秒容差 ——
// 同一档里编辑推荐优先，但真正快得多的采集台仍可反超。
// 这样既满足「能播的、快的排前面」，又不至于把手工挑选的经典台全部挤到后面。

import RAW from '../data/stream-health.json';

export type StreamTier = 0 | 1 | 2;

export interface StreamHealth {
  /** 0 可播 · 1 受限 · 2 死链 */
  tier: StreamTier;
  /** 首字节延迟（毫秒），仅 tier=0 有意义 */
  ms: number;
  /** 是否在体检表里（false = 新增未测，按 tier=1 处理） */
  known: boolean;
}

const MAP = RAW as unknown as Record<string, [number, number]>;

/** 精选台在排序时获得的延迟容差（毫秒） */
const CURATED_BONUS = 1200;

export function healthOf(url: string): StreamHealth {
  const v = MAP[url];
  if (!v) return { tier: 1, ms: 0, known: false };
  return { tier: (v[0] === 0 ? 0 : v[0] === 2 ? 2 : 1) as StreamTier, ms: v[1] || 0, known: true };
}

/** 排序键：越小越靠前 */
export function stationOrder(url: string, curated: boolean): number {
  const h = healthOf(url);
  const ms = Math.max(0, h.ms - (curated ? CURATED_BONUS : 0));
  // 分档为主序（每档 1000 万偏移，远超任何延迟差），延迟为次序
  return h.tier * 1e7 + ms;
}

/** 按国内可播性排序（稳定：同键保持原相对顺序） */
export function sortStations<T extends { url: string }>(list: T[], isCurated: (s: T) => boolean): T[] {
  return list
    .map((s, i) => ({ s, i, k: stationOrder(s.url, isCurated(s)) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.s);
}
