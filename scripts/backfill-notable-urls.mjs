// 为无 url 的 notableRadios 匹配可播放流（radio-browser name 搜索 + https/CORS 验证）
// 输出 JSON 映射到 /tmp/backfill-map.json，供后续脚本写回 regions/*.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { globSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REGIONS = join(ROOT, 'src', 'data', 'regions');

const MIRRORS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];

// 解析 regions 所有无 url 的 notableRadios
function extractEntries() {
  const files = ['europe1.ts', 'europe2.ts', 'americas.ts', 'africa.ts', 'asia.ts', 'oceania.ts'];
  const entries = [];
  for (const fn of files) {
    const t = readFileSync(join(REGIONS, fn), 'utf8');
    let m;
    const slugRe = /slug: '([^']+)'/g;
    // 找每个 slug 的位置
    const slugs = [...t.matchAll(slugRe)].map((x) => ({ slug: x[1], idx: x.index }));
    for (let si = 0; si < slugs.length; si++) {
      const { slug, idx } = slugs[si];
      const end = si + 1 < slugs.length ? slugs[si + 1].idx : t.length;
      const block = t.slice(idx, end);
      const isoM = block.match(/iso: '([^']+)'/);
      const iso = isoM ? isoM[1] : slug.toUpperCase();
      const nm = block.match(/notableRadios:\s*\[([\s\S]*?)\]\s*,/);
      if (!nm) continue;
      const items = [...nm[1].matchAll(/\{([^{}]*)\}/g)].map((x) => x[1]);
      for (const it of items) {
        if (!it.includes('genre')) continue;
        if (it.includes('url:')) continue;
        const nameM = it.match(/name:\s*'([^']+)'/);
        if (!nameM) continue;
        entries.push({ file: fn, slug, iso, name: nameM[1] });
      }
    }
  }
  return entries;
}

// 提取核心搜索词
function searchKeys(name) {
  let s = name;
  s = s.replace(/\(.*?\)/g, ' '); // 去括号
  s = s.replace(/[\/\-–—]/g, ' '); // 分隔符转空格
  const tokens = s.split(/[\s,]+/).filter(Boolean);
  const keys = [];
  for (const tk of tokens) {
    if (/^\d+(\.\d+)?$/.test(tk)) continue; // 纯数字
    if (/^(fm|am|radio|the|de|la|el|le|il|der|die|das|rádio|radio)$/i.test(tk)) continue;
    keys.push(tk);
  }
  // 优先用最长的关键词（最具体）
  return keys.sort((a, b) => b.length - a.length).slice(0, 3);
}

async function getJSON(mirror, path) {
  const res = await fetch(`${mirror}${path}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function withMirror(fn) {
  let lastErr;
  for (const m of MIRRORS) {
    try { return await fn(m); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function isHlsUrl(u) { return /\.m3u8/i.test(u || ''); }
async function verify(url) {
  if (!url || !/^https:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const cors = res.headers.get('access-control-allow-origin') || '';
    const ctOk = ct.includes('mpeg') || ct.includes('audio') || ct.includes('octet') || ct.includes('x-mpegurl') || ct.includes('mp3') || ct.includes('aac');
    const corsOk = !isHlsUrl(url) || cors === '*';
    try { await res.body?.cancel(); } catch {}
    return res.status === 200 && ctOk && corsOk;
  } catch { return false; }
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// 匹配：notable 名 与 candidate 名的相似度
function matchScore(notableName, candName) {
  const a = norm(notableName);
  const b = norm(candName);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.includes(a)) return 90;
  if (a.includes(b)) return 85;
  // token overlap
  const ta = new Set(a.split(' ').filter((x) => x.length > 2));
  const tb = new Set(b.split(' ').filter((x) => x.length > 2));
  let overlap = 0;
  for (const x of ta) if (tb.has(x)) overlap++;
  return overlap * 20;
}

async function findStream(iso, name) {
  const keys = searchKeys(name);
  const cands = new Map();
  for (const k of keys) {
    try {
      const arr = await withMirror((m) =>
        getJSON(m, `/json/stations/search?name=${encodeURIComponent(k)}&countrycode=${iso}&hidebroken=true&order=votes&reverse=true&limit=15`)
      );
      for (const s of arr) {
        if (!s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) continue;
        if (Number(s.lastcheckok) !== 1) continue;
        cands.set(s.stationuuid, s);
      }
    } catch {}
  }
  if (!cands.size) return null;
  let best = null, bestScore = 0;
  for (const s of cands.values()) {
    const sc = matchScore(name, s.name);
    if (sc > bestScore) { bestScore = sc; best = s; }
  }
  if (best && bestScore >= 40) {
    const ok = await verify(best.url_resolved);
    if (ok) return { name: best.name, url: best.url_resolved, hls: isHlsUrl(best.url_resolved), score: bestScore };
  }
  return null;
}

async function main() {
  const entries = extractEntries();
  console.log(`无 url 电台总数: ${entries.length}`);
  const only = process.argv[2]; // 可选大洲过滤：eu / am / all
  const scope = entries.filter((e) => {
    if (!only || only === 'all') return true;
    if (only === 'eu') return e.file.startsWith('europe');
    if (only === 'am') return e.file === 'americas.ts';
    return true;
  });
  console.log(`本次处理: ${scope.length} 条`);

  const map = {}; // slug -> [{ name, url, hls, matchedName, score }]
  let hit = 0;
  for (const e of scope) {
    try {
      const r = await findStream(e.iso, e.name);
      if (r) {
        map[e.slug] = map[e.slug] || [];
        map[e.slug].push({ name: e.name, url: r.url, hls: r.hls, matchedName: r.name, score: r.score });
        hit++;
        console.log(`✓ ${e.iso} | ${e.name} → ${r.name} (${r.score})`);
      } else {
        console.log(`✗ ${e.iso} | ${e.name}`);
      }
    } catch (err) {
      console.log(`✗ ${e.iso} | ${e.name} ERR ${err.message}`);
    }
  }
  writeFileSync('/tmp/backfill-map.json', JSON.stringify(map, null, 2));
  console.log(`\n匹配成功 ${hit}/${scope.length}，写入 /tmp/backfill-map.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
