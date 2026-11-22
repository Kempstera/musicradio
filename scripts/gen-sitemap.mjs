/**
 * 生成 sitemap.xml。
 *
 * 为什么不用 @astrojs/sitemap：这个项目装包会碰到沙箱里 node_modules 的
 * unlink/rename 限制，而这里要做的事就是「把 dist 下已有的 index.html 列出来」，
 * 用 node 自带模块十几行就够，没有必要为它引一个依赖。
 *
 * 用法：node scripts/gen-sitemap.mjs        （astro build 之后跑）
 *      node scripts/gen-sitemap.mjs --check（只报告，不写文件）
 *
 * 约定：
 * - 站点是目录式输出（/countries/xxx/index.html → /countries/xxx/），
 *   所以 URL 一律带结尾斜杠，避免和 Cloudflare 的 308 跳转打架。
 * - /visits 是站长自用的统计页，不收录。
 * - 语言由前端协商、不是独立路径，所以不需要 hreflang。
 */
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const SITE = 'https://musicradio.signupeverywhere.cc';
// 跟 astro.config.mjs 用同一个开关：本地预览时产物在 /var/tmp 下，
// 这里如果写死 ../dist/，sitemap 会写到旧的 dist 里，预览站点上就没有它。
const DIST = process.env.MR_OUTDIR
  ? new URL(`file://${process.env.MR_OUTDIR.replace(/\/$/, '')}/`).pathname
  : new URL('../dist/', import.meta.url).pathname;
const SKIP = new Set(['visits']);          // 不收录的顶层目录
const CHECK = process.argv.includes('--check');

/** 找出所有 index.html，返回 {urlPath, file, lastmod} */
async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      // _astro / fonts / img 这类静态资源目录里不会有 index.html，但走一遍也不贵
      await walk(p, out);
    } else if (e.name === 'index.html') {
      const rel = relative(DIST, dir).split(sep).filter(Boolean);
      const urlPath = '/' + (rel.length ? rel.join('/') + '/' : '');
      if (SKIP.has(rel[0])) continue;
      const st = await stat(p);
      out.push({ urlPath, lastmod: st.mtime.toISOString().slice(0, 10) });
    }
  }
  return out;
}

const pages = await walk(DIST);
// 首页永远排第一，其余按路径字母序，人看的时候好核对
pages.sort((a, b) => (a.urlPath === '/' ? -1 : b.urlPath === '/' ? 1 : a.urlPath.localeCompare(b.urlPath)));

const body = pages.map(p =>
  `  <url>\n    <loc>${SITE}${p.urlPath}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n  </url>`
).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

if (CHECK) {
  console.log(`检查模式：${pages.length} 条 URL，未写入。`);
} else {
  await writeFile(join(DIST, 'sitemap.xml'), xml, 'utf8');
  console.log(`sitemap.xml 已生成：${pages.length} 条 URL`);
}
