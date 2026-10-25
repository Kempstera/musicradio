// 陆地轮廓的解析与逐帧投影。
//
// 数据本体在 `src/data/land.ts`（构建期用），**刻意不在这里 import** ——
// 那个字符串有近 10 KB，只出现在首页 HTML 里一次，由客户端从
// `<script type="application/json" id="land-data">` 读回来再解析。
// 这样它就不会同时被打进 JS bundle，白白多传一份。
//
// 投影公式与 lib/globe.ts 完全一致：先绕地轴转 yaw，再绕 X 轴俯仰，
// z > 0 才落在朝向观众的这一面。
import { CX, CY, R, INITIAL_PITCH } from './globe';

const RAD = Math.PI / 180;

export interface LandShape {
  lat: Float32Array;
  lng: Float32Array;
  /** 每一段（一个环）在 lat/lng 里的起点 */
  start: Int32Array;
  /** 每一段的点数 */
  count: Int32Array;
}

/**
 * 解析 `land.ts` 里那串「段|点;点;点」的增量编码。
 * 单位 0.1°，每段首点相对 (0,0)，即绝对值；每个点写的是「经度,纬度」。
 */
export function parseLand(src: string): LandShape {
  const segs = src.split('|');
  let total = 0;
  for (let k = 0; k < segs.length; k++) total += segs[k].split(';').length;

  const lat = new Float32Array(total);
  const lng = new Float32Array(total);
  const start = new Int32Array(segs.length);
  const count = new Int32Array(segs.length);

  let i = 0;
  for (let k = 0; k < segs.length; k++) {
    start[k] = i;
    // ⚠️ 顺序是「经度,纬度」—— 跟 GeoJSON / Natural Earth 的原始次序一致。
    // 之前这里写反了，整张地图被转置（球面上看起来仍然「像」一张地图，
    // 所以肉眼一时没发现），结果 195 个国家点全落在海上。
    let lon = 0;
    let lat0 = 0;
    const pts = segs[k].split(';');
    for (let j = 0; j < pts.length; j++) {
      const p = pts[j];
      const c = p.indexOf(',');
      lon += +p.slice(0, c);
      lat0 += +p.slice(c + 1);
      lat[i] = lat0 / 10;
      lng[i] = lon / 10;
      i++;
    }
    count[k] = pts.length;
  }
  return { lat, lng, start, count };
}

/**
 * 每段一条 path。跨到背面就断开 —— 不断的话线段会横穿整个球，
 * 变成一堆穿模的直线。
 */
export function landPaths(shape: LandShape, yaw: number, pitch = INITIAL_PITCH): string[] {
  const { lat, lng, start, count } = shape;
  const cosP = Math.cos(pitch * RAD);
  const sinP = Math.sin(pitch * RAD);
  const out: string[] = new Array(start.length);

  for (let k = 0; k < start.length; k++) {
    const i0 = start[k];
    const n = count[k];
    let d = '';
    let pen = false;
    for (let j = 0; j < n; j++) {
      const idx = i0 + j;
      const p = lat[idx] * RAD;
      const t = (lng[idx] + yaw) * RAD;
      const cp = Math.cos(p);
      const x = cp * Math.sin(t);
      const y = Math.sin(p);
      const z = cp * Math.cos(t);
      const y2 = y * cosP - z * sinP;
      const z2 = y * sinP + z * cosP;

      if (z2 > 0) {
        const sx = CX + R * x;
        const sy = CY - R * y2;
        d += (pen ? 'L' : 'M') + sx.toFixed(1) + ' ' + sy.toFixed(1);
        pen = true;
      } else {
        pen = false;
      }
    }
    out[k] = d;
  }
  return out;
}
