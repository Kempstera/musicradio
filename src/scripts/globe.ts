// 首页那颗地球。
//
// 纯手写投影，不引任何 3D 库：195 个国家/地区是球面上的 195 个单位向量，
// 每帧绕地轴转一个角度、做一次正射投影，z > 0 的那一半才画到正面。
// 经纬网走同一条路，所以网格和点永远是同一个视角。
//
// 首帧由 index.astro 在构建期算好写进 HTML（同一套 lib/globe 函数），
// 这段脚本只是「接管」：JS 没跑起来时，地球仍然完整，只是不转。
import {
  project,
  graticule,
  VIEWBOX,
  CX,
  CY,
  R,
  INITIAL_YAW,
  INITIAL_PITCH,
} from '../lib/globe';
import { LANG_CHANGE_EVENT } from '../lib/i18n';

/** [slug, continent, lat, lng, nameZh, nameEn, iso] */
type Row = [string, string, number, number, string, string, string];

const wrap = document.querySelector<HTMLElement>('[data-globe]');
const svg = wrap?.querySelector<SVGSVGElement>('svg');
const dataEl = document.getElementById('globe-data');
const gridEl = wrap?.querySelector<SVGGElement>('.globe__grid');
// 点位在 DOM 里按大洲分组，下标靠 data-i 对回数据行，别依赖 DOM 顺序
const dotEls: SVGCircleElement[] = [];
wrap?.querySelectorAll<SVGCircleElement>('.globe__dot').forEach((el) => {
  dotEls[Number(el.dataset.i)] = el;
});
const readout = wrap?.querySelector<HTMLElement>('.atlas__readout');
const readoutText = wrap?.querySelector<HTMLElement>('.atlas__readout-text');

if (wrap && svg && dataEl && gridEl && dotEls.length && readout && readoutText) {
  const rows: Row[] = JSON.parse(dataEl.textContent || '[]');

  // 每帧要用的常量，先算好
  const RAD = Math.PI / 180;
  const cosLat = rows.map((r) => Math.cos(r[2] * RAD));
  const sinLat = rows.map((r) => Math.sin(r[2] * RAD));
  const lngRad = rows.map((r) => r[3] * RAD);

  const gridEls = Array.from(gridEl.querySelectorAll('path'));

  // 六大洲的颜色直接从 CSS 变量读，不在 JS 里再抄一份调色板
  const colors: Record<string, string> = {};
  wrap.querySelectorAll<SVGGElement>('g[data-region]').forEach((g) => {
    const c = getComputedStyle(g).getPropertyValue('--region').trim();
    if (c) colors[g.dataset.region as string] = c;
  });
  rows.forEach((r, i) => {
    const c = colors[r[1]];
    if (c) dotEls[i].style.fill = c;
  });

  // 大洲名一律从索引行里现取 —— 切换语言后它会自己更新，不必在这里再存一份翻译
  const continentName = (id: string) =>
    wrap.querySelector(`.atlas__row[data-region="${id}"] .atlas__name`)?.textContent?.trim() || '';

  const isZh = () => document.documentElement.lang.toLowerCase().indexOf('zh') === 0;
  const flag = (iso: string) =>
    String.fromCodePoint(...[...iso].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

  let yaw = INITIAL_YAW;
  let hover = -1;
  let filter: string | null = null; // 指针停在某个大洲的索引行上时，只亮那一洲的点

  // ── 指针状态 ────────────────────────────────────────────────
  const pointer = { x: 0, y: 0, active: false, unit: 1 };

  // 每帧画完之后把屏幕坐标存下来，命中判定直接查这张表
  const px = new Float32Array(rows.length);
  const py = new Float32Array(rows.length);
  const pz = new Uint8Array(rows.length);

  let dragging = false;
  let dragMoved = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // 度/秒

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setUnit() {
    const r = svg!.getBoundingClientRect();
    // 1 CSS px 折算成多少 viewBox 单位 —— 悬停命中半径要按屏幕上的手感来定
    pointer.unit = r.width > 0 ? VIEWBOX / r.width : 1;
  }
  setUnit();
  window.addEventListener('resize', setUnit, { passive: true });

  // ── 绘制 ────────────────────────────────────────────────────
  let shownYaw = NaN;
  let shownHover = -2;
  let shownFilter: string | null = '__init__';
  let dirty = true; // 指针动了但球没动的时候也要重画一遍（否则悬停永远不亮）

  function draw() {
    const paths = graticule(yaw, INITIAL_PITCH);
    for (let i = 0; i < gridEls.length; i++) gridEls[i].setAttribute('d', paths[i] || '');

    const cosP = Math.cos(INITIAL_PITCH * RAD);
    const sinP = Math.sin(INITIAL_PITCH * RAD);

    for (let i = 0; i < rows.length; i++) {
      const t = lngRad[i] + yaw * RAD;
      const x = cosLat[i] * Math.sin(t);
      const y = sinLat[i];
      const z = cosLat[i] * Math.cos(t);
      const y2 = y * cosP - z * sinP;
      const z2 = y * sinP + z * cosP;

      const sx = CX + R * x;
      const sy = CY - R * y2;
      const front = z2 > 0;
      const el = dotEls[i];

      el.setAttribute('cx', sx.toFixed(1));
      el.setAttribute('cy', sy.toFixed(1));

      const dim = filter !== null && filter !== rows[i][1];
      el.style.opacity = front ? (dim ? '0.16' : '1') : '0.1';
      el.setAttribute('r', front && !dim ? '3.1' : '2.4');

      // 记住屏幕上画在哪，命中判定直接用这批数，不必再投一次
      px[i] = sx;
      py[i] = sy;
      pz[i] = front ? 1 : 0;
    }

    const best = pointer.active ? findNearest(pointer.x, pointer.y) : -1;

    if (best !== hover) {
      if (hover >= 0 && hover < rows.length) dotEls[hover].setAttribute('r', '3.1');
      hover = best;
      paintReadout();
    }
    if (hover >= 0) {
      dotEls[hover].setAttribute('r', '5.6');
      dotEls[hover].style.opacity = '1';
    }
  }

  /** 屏幕上离 (vx, vy) 最近的正面点；超出「手指半径」就算没点到。 */
  function findNearest(vx: number, vy: number) {
    const hitR = 15 * pointer.unit;
    let best = -1;
    let bestD = hitR * hitR;
    for (let i = 0; i < rows.length; i++) {
      if (!pz[i]) continue;
      const dx = px[i] - vx;
      const dy = py[i] - vy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = i;
      }
    }
    return best;
  }

  function paintReadout() {
    if (hover < 0) {
      readout!.classList.remove('is-live');
      readoutText!.textContent = '';
      return;
    }
    const r = rows[hover];
    readoutText!.textContent = `${flag(r[6])} ${isZh() ? r[4] : r[5]} · ${continentName(r[1])}`;
    readout!.classList.add('is-live');
  }

  // ── 循环 ────────────────────────────────────────────────────
  let raf = 0;
  let last = 0;
  let paused = false;

  function frame(now: number) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;

    if (!dragging) {
      // 甩出去之后靠惯性继续转，慢慢衰减
      if (Math.abs(velocity) > 0.5) {
        yaw += velocity * (dt / 1000);
        velocity *= Math.exp(-3.2 * (dt / 1000));
      } else {
        velocity = 0;
        // 悬停时停转：否则鼠标底下的那个点会自己跑掉
        if (!reduce.matches && !pointer.active && filter === null) yaw += 0.003 * dt;
      }
    }

    // 自转很慢，每帧都重画 195 个点是白烧电。转过 0.12° 才画一次 ——
    // 3°/s 的转速下约 25fps，肉眼仍然是连续的。
    if (
      dirty ||
      Math.abs(yaw - shownYaw) >= 0.12 ||
      hover !== shownHover ||
      filter !== shownFilter
    ) {
      draw();
      dirty = false;
      shownYaw = yaw;
      shownHover = hover;
      shownFilter = filter;
    }

    raf = paused ? 0 : requestAnimationFrame(frame);
  }

  function start() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // 离屏就停，省电
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        paused = entries[0].isIntersecting === false;
        if (paused) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else start();
      },
      { rootMargin: '200px' },
    ).observe(wrap);
  } else start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  });

  start();

  function setPointerFrom(clientX: number, clientY: number) {
    const r = svg!.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * VIEWBOX;
    pointer.y = ((clientY - r.top) / r.height) * VIEWBOX;
    pointer.active = true;
    pointer.unit = r.width > 0 ? VIEWBOX / r.width : 1;
  }

  // ── 交互 ────────────────────────────────────────────────────
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = 0;
    velocity = 0;
    lastX = e.clientX;
    lastT = performance.now();
    wrap.classList.add('is-dragging');
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* 合成事件没有真实指针，忽略 */
    }

    // 手机上没有 hover：按下的那一刻就得判出点到了谁，
    // 否则抬手时 hover 还是 -1，怎么点都跳不过去。
    setPointerFrom(e.clientX, e.clientY);
    const hit = findNearest(pointer.x, pointer.y);
    if (hit !== hover) {
      hover = hit;
      paintReadout();
      dirty = true;
    }
  });

  svg.addEventListener('pointermove', (e) => {
    setPointerFrom(e.clientX, e.clientY);
    dirty = true;

    if (dragging) {
      const now = performance.now();
      const dt = Math.max(8, now - lastT);
      const dx = e.clientX - lastX;
      const r = svg.getBoundingClientRect();
      // 横着拖过整个球面 ≈ 转半圈，手感跟真的拨一个球一样
      const degPerPx = (180 * VIEWBOX) / (460 * r.width);
      const deg = dx * degPerPx;
      yaw += deg;
      dragMoved += Math.abs(dx);
      velocity = Math.max(-800, Math.min(800, (deg / dt) * 1000));
      lastX = e.clientX;
      lastT = now;
    }
  });

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove('is-dragging');
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      /* 指针已经没了，忽略 */
    }
  }

  svg.addEventListener('pointerup', (e) => {
    const wasDrag = dragMoved > 4;
    endDrag(e);
    // 拖一下就跳走会很烦，所以只有真正「点」到某个点才进国家页
    if (!wasDrag && hover >= 0) {
      window.location.href = `/countries/${rows[hover][0]}`;
      return;
    }
    // 手指抬起来之后没有「悬停」这回事：读数回到提示，自转恢复
    if (e.pointerType !== 'mouse') {
      pointer.active = false;
      dirty = true;
    }
  });
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('pointerleave', () => {
    pointer.active = false;
    dirty = true;
  });

  // 指针停在某个大洲的索引行上：只留那一洲的点，其余压到很淡
  wrap.querySelectorAll<HTMLElement>('.atlas__row').forEach((row) => {
    const id = row.dataset.region || '';
    row.addEventListener('pointerenter', () => {
      filter = id;
      row.classList.add('is-hot');
    });
    row.addEventListener('pointerleave', () => {
      filter = null;
      row.classList.remove('is-hot');
    });
    row.addEventListener('focus', () => {
      filter = id;
    });
    row.addEventListener('blur', () => {
      filter = null;
    });
  });

  // 切语言后，若指针正停在某个国家上，读数行要跟着换
  window.addEventListener(LANG_CHANGE_EVENT, () => {
    paintReadout();
  });

  // 首次进来先画一遍，把后备点的半径/透明度定下来
  draw();
  shownYaw = yaw;
}
