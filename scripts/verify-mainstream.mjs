// 验证 3 个欧洲台的正确主台流（Classic FM / Radio Moldova / BNR 文化台）
import { writeFileSync } from 'node:fs';

const MIRRORS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
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
    return { ok: res.status === 200 && ctOk && corsOk, status: res.status, ct, cors };
  } catch (e) { return { ok: false, err: e.message }; }
}
async function search(iso, query, limit = 20) {
  try {
    for (const m of MIRRORS) {
      const res = await fetch(`${m}/json/stations/search?countrycode=${iso}&name=${encodeURIComponent(query)}&hidebroken=true&order=votes&reverse=true&limit=${limit}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    }
  } catch {}
  return [];
}

async function main() {
  const out = {};

  console.log('=== Classic FM 主台候选 ===');
  for (const u of [
    'https://media-ice.musicradio.com/ClassicFMMP3',
    'https://media-the.musicradio.com/ClassicFMMP3',
    'https://playerservices.streamtheworld.com/api/livestream-redirect/CLASSICFM.mp3',
    'https://media-ice.musicradio.com/ClassicFM',
  ]) {
    const r = await verify(u);
    console.log(`  ${u} → ${JSON.stringify(r)}`);
    if (r.ok) { out.classicFm = u; break; }
  }

  console.log('\n=== Radio Moldova 主台（搜索 MD 所有 Radio Moldova）===');
  const md = await search('MD', 'Radio Moldova');
  for (const s of md) {
    console.log(`  - ${s.name} | ${s.url_resolved} | votes=${s.votes} | ok=${s.lastcheckok}`);
  }
  // 找非 Tineret 的 Radio Moldova
  const main = md.find((s) => /moldova/i.test(s.name) && !/tineret/i.test(s.name) && /^https:/.test(s.url_resolved || '') && Number(s.lastcheckok) === 1);
  if (main) {
    const r = await verify(main.url_resolved);
    console.log(`  主台候选: ${main.name} → ${main.url_resolved} verify=${JSON.stringify(r)}`);
    if (r.ok) out.radioMoldova = main.url_resolved;
  }

  console.log('\n=== BNR 文化/音乐台（搜索 BG）===');
  for (const q of ['Hristo Botev', 'BNR', 'Horizont']) {
    const arr = await search('BG', q);
    for (const s of arr) {
      console.log(`  [${q}] - ${s.name} | ${s.url_resolved} | votes=${s.votes}`);
    }
  }
  // BNR 文化台 Hristo Botev 主台流
  const hb = (await search('BG', 'Hristo Botev')).find((s) => /hristo|botev/i.test(s.name) && /^https:/.test(s.url_resolved || '') && Number(s.lastcheckok) === 1);
  if (hb) {
    const r = await verify(hb.url_resolved);
    console.log(`  Hristo Botev: ${hb.url_resolved} verify=${JSON.stringify(r)}`);
    if (r.ok) out.bnrCulture = hb.url_resolved;
  }

  writeFileSync('/tmp/mainstream-map.json', JSON.stringify(out, null, 2));
  console.log('\n结果:', JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
