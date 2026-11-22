/**
 * 生成 RSS（双周刊）。
 *
 * 这个站没有数据库，也没有 CMS：一期杂志就是一个 .astro 文件。
 * 所以 feed 的条目直接从「已知的期号清单」里列出来，发布日期取该文件在 git 里
 * 第一次出现的日期——比手写一个常量可靠，也不会忘了改。
 *
 * 用法：node scripts/gen-feed.mjs   （astro build 之后跑）
 */
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = 'https://musicradio.signupeverywhere.cc';
// 和 gen-sitemap.mjs 保持一致：尊重 MR_OUTDIR，否则预览产物里缺 feed。
const DIST = process.env.MR_OUTDIR
  ? new URL(`file://${process.env.MR_OUTDIR.replace(/\/$/, '')}/`).pathname
  : new URL('../dist/', import.meta.url).pathname;

// 一期 = 一个文件。中英各一页，算同一期的两个语言版本。
// 顺序：最新一期放最前面（feed 的第一条就是读者看到的第一条）。
const ISSUES = [
  {
    zh: { title: '亚的斯亚贝巴的五声音阶：Mulatu Astatke 与被中断的爵士年代', path: '/magazine/issue-02/' },
    en: { title: 'The Pentatonic Nights of Addis Ababa: Mulatu Astatke and an Interrupted Jazz Age', path: '/magazine/issue-02-en/' },
    vol: 'Vol. 02',
    source: 'src/pages/magazine/issue-02.astro',
    // 这一期还没提交进 git，取不到首次提交日期，就用上线当天兜底。
    // 提交之后 git 里有了记录，会自动改用真实日期。
    fallbackDate: '2026-11-22',
  },
  {
    zh: { title: '秘鲁的隐秘回响：Susana Baca 与木箱里的黑非洲', path: '/magazine/issue-01/' },
    en: { title: 'A Hidden Echo of Peru: Susana Baca and the Black Africa in a Wooden Box', path: '/magazine/issue-01-en/' },
    vol: 'Vol. 01',
    source: 'src/pages/magazine/issue-01.astro',
    fallbackDate: '2026-11-10',
  },
];

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** RFC 822：RSS 的 pubDate 要求英文星期与月份缩写，不能用本地化的格式 */
function rfc822(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DAY[dt.getUTCDay()]}, ${String(d).padStart(2, '0')} ${MON[m - 1]} ${y} 00:00:00 +0800`;
}

/** 该文件在 git 里首次出现的日期；取不到就退回一个明确的常量，不静默出错 */
function firstCommit(file, fallback = '2026-11-10') {
  try {
    const out = execFileSync('git',
      ['log', '--diff-filter=A', '--format=%ad', '--date=short', '--', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const last = out.split('\n').filter(Boolean).pop();
    if (last && /^\d{4}-\d{2}-\d{2}$/.test(last)) return last;
  } catch { /* 没有 git、浅克隆、或者文件未提交 */ }
  return fallback;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const items = [];
for (const it of ISSUES) {
  const date = firstCommit(it.source, it.fallbackDate);
  for (const lang of ['zh', 'en']) {
    const v = it[lang];
    const url = SITE + v.path;
    items.push(
      '  <item>\n' +
      `    <title>${esc(`${it.vol} · ${v.title}`)}</title>\n` +
      `    <link>${url}</link>\n` +
      `    <guid isPermaLink="false">${url}#${it.vol.replace(/\s+/g, '-').toLowerCase()}</guid>\n` +
      `    <pubDate>${rfc822(date)}</pubDate>\n` +
      `    <description>${esc(v.title)}</description>\n` +
      '  </item>');
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>如聽仙樂耳暫明 · 双周刊</title>
  <link>${SITE}/</link>
  <description>每两周一期，一期一座土地的声音：历史、音乐家与可播放的电台。</description>
  <language>zh-CN</language>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
</channel>
</rss>
`;

await writeFile(join(DIST, 'feed.xml'), xml, 'utf8');
console.log(`feed.xml 已生成：${items.length} 条`);
