// 地球仪的几何：把经纬度摆到球面上，再按当前朝向做一次正射投影。
//
// 构建期与运行时共用同一份：`index.astro` 在 frontmatter 里用它画出「静态首帧」，
// 客户端脚本用它逐帧改写 —— 于是 JS 没跑起来时，页面上的地球也是完整的、
// 只是不转而已。两边算的是同一套数，不会出现首帧跳一下。

export const VIEWBOX = 500;
export const CX = 250;
export const CY = 250;
/** 球半径（viewBox 单位）。留 50 给光晕和悬停放大。 */
export const R = 230;

/** 起始朝向：正对 10°E（欧洲西岸到大西洋），略微俯视北半球。 */
export const INITIAL_YAW = -10;
export const INITIAL_PITCH = 14;

const RAD = Math.PI / 180;

export type Projected = [x: number, y: number, z: number];

/**
 * 正射投影。yaw 是绕地轴的经度偏移（度），pitch 是绕 X 轴的俯仰（度）。
 * 返回值 z > 0 表示朝向观众的一面。
 */
export function project(lat: number, lng: number, yaw: number, pitch = INITIAL_PITCH): Projected {
  const p = lat * RAD;
  const t = (lng + yaw) * RAD;
  const cosP = Math.cos(p);
  const x = cosP * Math.sin(t);
  const y = Math.sin(p);
  const z = cosP * Math.cos(t);

  const cp = Math.cos(pitch * RAD);
  const sp = Math.sin(pitch * RAD);
  // 绕 X 轴俯仰：北极往观众这边倒一点
  const y2 = y * cp - z * sp;
  const z2 = y * sp + z * cp;

  return [CX + R * x, CY - R * y2, z2];
}

/** 把一串投影点连成 path，跨到背面就断开（否则会横穿整个球）。 */
export function polyline(points: Projected[]): string {
  let d = '';
  let pen = false;
  for (const [x, y, z] of points) {
    if (z > 0) {
      d += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      pen = true;
    } else {
      pen = false;
    }
  }
  return d;
}

/** 经纬网：12 条经线 + 5 条纬线，采样步长 6°。
 *  注意：**永远返回 17 条 path**（背面的可能算出来是空串）——
 *  客户端按下标把 d 写回同一批元素，条数一变就会错位。 */
export function graticule(yaw: number, pitch = INITIAL_PITCH): string[] {
  const paths: string[] = [];
  const step = 6;

  for (let lng = -180; lng < 180; lng += 30) {
    const pts: Projected[] = [];
    for (let lat = -90; lat <= 90; lat += step) pts.push(project(lat, lng, yaw, pitch));
    paths.push(polyline(pts));
  }

  for (const lat of [-60, -30, 0, 30, 60]) {
    const pts: Projected[] = [];
    for (let lng = -180; lng <= 180; lng += step) pts.push(project(lat, lng, yaw, pitch));
    paths.push(polyline(pts));
  }

  return paths;
}
