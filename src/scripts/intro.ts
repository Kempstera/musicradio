// 首访过场：浩瀚宇宙里浮出一颗地球，然后它缩小、落回首页上的位置，
// 页面在最后半秒里跟着显影。
//
// 三件事决定了写法：
//
// 1. **只在第一次**。判定和「首帧之前就把内容压住」都在 Base 的 <head> 内联脚本里
//    完成（加 html.mr-intro + 写 localStorage）。这里只负责「mr-intro 存在就跑」。
//    这样不会先闪一下米色纸面再切黑，也不会让回头客付任何代价 —— 下面这些
//    星场、克隆出来的 622 个节点，全都是一次性的 DOM，不进 HTML。
//
// 2. **地球是克隆的，不是另画的**。直接从首页那颗 SVG 复制（427 条海岸线 +
//    195 个国家点），用 transform 缩放平移把它从「宇宙尺度」搬到它真正的
//    位置上。因为两端是同一份几何、同一个 INITIAL_YAW，落地那一帧和真身
//    严丝合缝 —— 最后 15% 把克隆淡出，视觉上就是「它变成了页面上那颗」。
//    另画一颗的话，光是要不要在宇宙里自转就够纠结：转了，交接时会跳一下。
//
// 3. **不改布局**。地球在页面里靠 .atlas 的 grid 定位，任何 reflow 都会让
//    落点算错。所以全程只用 transform / opacity，落点坐标是开场量一次
//    真实 rect 得到的。
const SVGNS = 'http://www.w3.org/2000/svg';

// 时间轴（毫秒，相对开场那一帧）
const T_EMERGE_A = 120; // 开始浮现
const T_EMERGE_B = 980; // 完全显形
const T_FLY_A = 1020; // 开始缩小、下落
const T_FLY_B = 2580; // 落到位
const T_VEIL_A = 2400; // 夜幕开始揭开
const T_VEIL_B = 3000; // 揭开完毕
const T_REVEAL = 2450; // 页面内容开始显影
const T_END = 3060; // 收工

const root = document.documentElement;

if (root.classList.contains('mr-intro')) boot();

function boot() {
  const svg = document.querySelector<SVGSVGElement>('[data-globe] svg.globe');
  if (!svg) {
    handoff();
    return;
  }

  // 落点：地球此刻在页面上的真实位置。开场时滚动位置是 0，量到的就是它。
  const box = svg.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (box.width < 40 || !vh) {
    handoff();
    return;
  }

  // 球体直径（viewBox 500 里半径 230）折算成屏幕像素
  const ball = box.width * (460 / 500);
  // 开场尺度：让球大约占到短边的九成；小屏上至少比原尺寸大一倍，否则没有「靠近」感
  const s0 = Math.max(1.9, Math.min(2.9, (Math.min(vw, vh) * 0.9) / ball));

  // ── 搭建舞台 ─────────────────────────────────────────────
  const layer = document.createElement('div');
  layer.className = 'intro';
  layer.setAttribute('aria-hidden', 'true');

  const stars = buildStars(vw, vh);
  const stage = document.createElement('div');
  stage.className = 'intro__stage';
  const glow = document.createElement('div');
  glow.className = 'intro__glow';
  const holder = document.createElement('div');
  holder.className = 'intro__globe';
  holder.style.width = box.width + 'px';
  holder.style.height = box.height + 'px';

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('class', 'globe');
  // 渐变 id 会重复（真身里已经有一份），改名并把引用换掉
  const grads = clone.querySelectorAll('[id]');
  for (const g of Array.from(grads)) {
    if (g.id === 'globe-sheen') g.id = 'globe-sheen-intro';
  }
  const sheen = clone.querySelector<SVGElement>('.globe__sheen');
  if (sheen) sheen.style.fill = 'url(#globe-sheen-intro)';

  holder.appendChild(clone);
  // 球面的晨昏线：左上受光、右下压暗，球才有体积。
  // 页面上那颗不需要 —— 那时候它只是一张图；几百像素的球没有立体感就散了。
  const shade = document.createElement('div');
  shade.className = 'intro__shade';
  holder.appendChild(shade);

  stage.append(glow, holder);
  layer.append(stars, stage);
  document.body.appendChild(layer);

  // 起点圆心 = 屏幕中心略偏上；终点圆心 = 地球在版面里的真实圆心
  const c0x = vw / 2;
  const c0y = vh * 0.46;
  const c1x = box.left + box.width / 2;
  const c1y = box.top + box.height / 2;

  const t0 = performance.now();
  let raf = 0;
  let revealed = false;

  const frame = () => {
    const t = performance.now() - t0;

    const e = easeOutCubic(clamp((t - T_EMERGE_A) / (T_EMERGE_B - T_EMERGE_A)));
    const f = easeInOutCubic(clamp((t - T_FLY_A) / (T_FLY_B - T_FLY_A)));

    // 浮现阶段再收一点点，像从远处慢慢靠近
    const s = lerp(s0, 1, f) * (1 + 0.05 * (1 - e));
    const cx = lerp(c0x, c1x, f);
    const cy = lerp(c0y, c1y, f);

    // transform-origin 是 0 0，所以左上角 = 圆心 − 半个缩放后的尺寸
    holder.style.transform =
      `translate3d(${(cx - (box.width * s) / 2).toFixed(2)}px,${(cy - (box.height * s) / 2).toFixed(2)}px,0)` +
      ` scale(${s.toFixed(4)})`;

    // 落地前淡出：真身已经在同一个位置上了，这一下等于交接
    holder.style.opacity = (e * (1 - smoothstep(0.86, 1, f))).toFixed(3);

    stars.style.opacity = (0.85 * easeOutCubic(clamp(t / 900))).toFixed(3);
    glow.style.opacity = (e * (1 - smoothstep(0.15, 0.75, f))).toFixed(3);
    layer.style.opacity = (1 - clamp((t - T_VEIL_A) / (T_VEIL_B - T_VEIL_A))).toFixed(3);

    if (!revealed && t >= T_REVEAL) reveal();

    if (t < T_END) raf = requestAnimationFrame(frame);
    else finish();
  };

  raf = requestAnimationFrame(frame);

  function reveal() {
    if (revealed) return;
    revealed = true;
    root.classList.remove('mr-intro');
    root.classList.add('mr-intro-out');
  }

  function finish() {
    cancelAnimationFrame(raf);
    reveal();
    layer.remove();
    // mr-intro-out 只负责那一段淡入，留久了会一直给 body 的每个孩子挂着 transition
    window.setTimeout(() => root.classList.remove('mr-intro-out'), 900);
  }
}

/** 兜底：量不到地球（页面结构变了 / 布局异常）就直接把页面放出来，不能把内容扣住。 */
function handoff() {
  root.classList.remove('mr-intro');
  root.classList.add('mr-intro-out');
  window.setTimeout(() => root.classList.remove('mr-intro-out'), 600);
}

/** 星场：位置由固定种子算出来，每次一样；低不透明度的一堆点，不闪才像远处。 */
function buildStars(vw: number, vh: number) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'intro__stars');
  svg.setAttribute('viewBox', '0 0 1200 800');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');

  // 星星数量跟屏幕面积走：手机上百来颗就够，大屏密一点才像「浩瀚」
  const n = Math.round(Math.min(200, Math.max(90, (vw * vh) / 9000)));
  let seed = 20261026;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  let markup = '';
  for (let i = 0; i < n; i++) {
    const x = (rnd() * 1200).toFixed(1);
    const y = (rnd() * 800).toFixed(1);
    // 平方分布：绝大多数是灰尘大小，偶尔一颗亮一点的
    const r = (0.35 + rnd() * rnd() * 1.6).toFixed(2);
    const o = (0.12 + rnd() * 0.6).toFixed(2);
    markup += `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`;
  }
  svg.innerHTML = markup;
  return svg;
}

function clamp(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
