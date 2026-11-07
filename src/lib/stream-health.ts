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
// 排序策略（2026-10 调整）：
//   ① 编辑精选台（notableRadios）自成一组，**按编辑给的顺序**排在最前 ——
//      用户打开英国页就是想找 BBC Radio 3，而不是「此刻延迟最低的那个采集流」。
//      精选台大多是新加的 HLS 地址，压根没进过体检表（tier 默认 1），
//      上一版按 tier 排就把它们全埋到几十个采集台下面去了。
//   ② 其余采集台先按国内可播性分档（0 能播 / 1 受限 / 2 死链），再按首字节延迟。
//   ③ 同档里「有简介」的优先 —— 有介绍说明这台的资料是站里认真核过的。

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

/** 「有简介」在同档里折算成的延迟优势（毫秒）：比任何实测延迟都大 */
const NOTE_PENALTY = 20000;

export function healthOf(url: string): StreamHealth {
  const v = MAP[url];
  if (!v) return { tier: 1, ms: 0, known: false };
  return { tier: (v[0] === 0 ? 0 : v[0] === 2 ? 2 : 1) as StreamTier, ms: v[1] || 0, known: true };
}

/** 排序键：越小越靠前（保留给需要单点比较的场景） */
export function stationOrder(url: string, curated: boolean): number {
  const h = healthOf(url);
  const top = curated && h.tier !== 2 ? 0 : 1;
  return top * 1e9 + h.tier * 1e7 + Math.min(h.ms, 19999);
}

/**
 * 按「知名 → 能播 → 有简介」排序（稳定）。
 *
 * @param isCurated 该台是否来自编辑精选（notableRadios）
 */
export function sortStations<T extends { url: string; note?: string }>(
  list: T[],
  isCurated: (s: T) => boolean,
): T[] {
  return list
    .map((s, i) => {
      const h = healthOf(s.url);
      // 死链的精选台不享受置顶，掉到最后一档，免得点开一片寂静
      const curated = isCurated(s) && h.tier !== 2;
      const band = curated ? 0 : h.tier === 0 ? 1 : h.tier === 1 ? 2 : 3;
      // 精选档用原下标当键 → 完全保留编辑顺序
      const key = band === 0 ? i : h.ms + (s.note ? 0 : NOTE_PENALTY);
      return { s, i, band, key };
    })
    .sort((a, b) => a.band - b.band || a.key - b.key || a.i - b.i)
    .map((x) => x.s);
}
