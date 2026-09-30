// 针对性补流：古巴音乐电台 + 4 个被 backfill 误匹配的欧洲主台（找正确主台流）
// 用法：node scripts/search-specific.mjs
import { writeFileSync } from 'node:fs';

const MIRRORS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];

function isHlsUrl(u) { return /\.m3u8/i.test(u || ''); }
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
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

async function search(iso, query, tag = null, limit = 30) {
  const params = [`countrycode=${iso}`, 'hidebroken=true', 'order=votes', 'reverse=true', `limit=${limit}`];
  if (query) params.push(`name=${encodeURIComponent(query)}`);
  if (tag) params.push(`tag=${encodeURIComponent(tag)}`);
  try {
    return await withMirror((m) => getJSON(m, `/json/stations/search?${params.join('&')}`));
  } catch { return []; }
}

// 对某国做全面采集（多 tag），返回验证通过的电台列表
async function collectCountry(iso, extraTags) {
  const tags = ['music', 'classical', 'jazz', 'latin', 'world', ...(extraTags || [])];
  const seen = new Map();
  for (const tag of tags) {
    const arr = await search(iso, '', tag);
    for (const s of arr) {
      if (!s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) continue;
      if (Number(s.lastcheckok) !== 1) continue;
      const name = (s.name || '').toLowerCase();
      if (/radio maria|relig|quran|islam|gospel|church|bible|sermon|christian|news|talk|sport/i.test(`${s.name} ${s.tags}`)) continue;
      if (!seen.has(s.stationuuid)) seen.set(s.stationuuid, s);
    }
  }
  const out = [];
  for (const s of seen.values()) {
    if (await verify(s.url_resolved)) {
      out.push({ name: s.name, url: s.url_resolved, hls: isHlsUrl(s.url_resolved), tags: s.tags, votes: s.votes });
    }
    if (out.length >= 10) break;
  }
  return out;
}

// 精确找某台主台流：按名称搜索，要求 norm 完全相等或高度包含
async function findExact(iso, targetNames) {
  for (const tn of targetNames) {
    const arr = await search(iso, tn);
    for (const s of arr) {
      if (!s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) continue;
      if (Number(s.lastcheckok) !== 1) continue;
      const a = norm(tn);
      const b = norm(s.name);
      // 要求名称精确相等，或候选名包含目标名（避免子频道：如 Classic FM Calm 会被排除，因为 norm('Classic FM') !== norm('Classic FM Calm')）
      const exact = a === b;
      const contains = b.includes(a) && b.replace(a, '').trim().length <= 8; // 允许轻微后缀，如 "(AAC)"、城市名
      if (exact || contains) {
        if (await verify(s.url_resolved)) {
          return { name: s.name, url: s.url_resolved, hls: isHlsUrl(s.url_resolved), votes: s.votes };
        }
      }
    }
  }
  return null;
}

async function main() {
  const results = {};

  console.log('=== 古巴 CU 音乐电台采集 ===');
  const cuba = await collectCountry('CU', ['salsa', 'son', 'trova', 'habana']);
  results.cuba = cuba;
  console.log(`古巴找到 ${cuba.length} 条可播放：`);
  for (const r of cuba) console.log(`  - ${r.name} → ${r.url}`);

  console.log('\n=== 欧洲 4 台主台精确查找 ===');
  const targets = [
    { iso: 'GB', name: 'Classic FM', names: ['Classic FM'] },
    { iso: 'PT', name: 'Antena 2', names: ['Antena 2'] },
    { iso: 'MD', name: 'Radio Moldova', names: ['Radio Moldova'] },
    { iso: 'BG', name: 'Radio Bulgaria', names: ['Radio Bulgaria', 'Hristo Botev', 'BNR'] },
  ];
  for (const t of targets) {
    const r = await findExact(t.iso, t.names);
    results[t.name] = r;
    console.log(`${t.iso} ${t.name}: ${r ? `${r.name} → ${r.url}` : '未找到'}`);
  }

  writeFileSync('/tmp/specific-map.json', JSON.stringify(results, null, 2));
  console.log('\n结果写入 /tmp/specific-map.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
