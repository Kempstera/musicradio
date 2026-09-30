// 采集并验证欧洲 + 北美（美国/加拿大/墨西哥/加勒比/中美）音乐电台，写入 radios.json
// 强化：只保留 https 流 + 逐条验证 200 + (HLS 需 CORS *)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'radios.json');

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

// 欧洲 44 国 ISO（含梵蒂冈 VA）+ 北美 23 国
const TARGETS = [
  'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
  'HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL',
  'PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA',
  'US','CA','MX','BZ','CR','SV','GT','HN','NI','PA','CU','DO','HT','JM','TT','BS',
  'BB','LC','VC','GD','DM','AG','KN','GY','SR',
];

const GENRE_TAGS = ['classical','jazz','pop','folk','culture','country','blues','soul','latin','world'];

const NON_MUSIC = [
  /\btv\b/i, /television/i, /quran/i, /koran/i, /قرآن/i, /古兰经/i, /abdulbasit/i,
  /islam/i, /islamic/i, /muslim/i, /mosque/i, /masjid/i, /bible/i, /scripture/i,
  /sermon/i, /preaching/i, /devotional/i, /christian/i, /catholic/i, /orthodox/i,
  /church/i, /gospel/i, /religion/i, /religious/i, /prayer/i, /adhan/i, /azan/i,
  /recitation/i, /sheikh/i, /mufti/i, /\bimam\b/i, /news/i, /talk/i, /sport/i, /sports/i,
];

function isNonMusic(s) {
  const text = `${s.name || ''} ${s.tags || ''}`;
  return NON_MUSIC.some((re) => re.test(text));
}

async function getJSON(mirror, path) {
  const res = await fetch(`${mirror}${path}`, { signal: AbortSignal.timeout(25000) });
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

// 验证：https + 200 + content-type + (HLS 需 CORS *)
async function verify(url) {
  if (!url || !/^https:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const cors = res.headers.get('access-control-allow-origin') || '';
    const ctOk = ct.includes('mpeg') || ct.includes('audio') || ct.includes('octet') || ct.includes('x-mpegurl') || ct.includes('mp3') || ct.includes('aac');
    const corsOk = !isHlsUrl(url) || cors === '*';
    try { await res.body?.cancel(); } catch {}
    return res.status === 200 && ctOk && corsOk;
  } catch {
    return false;
  }
}

async function collect(iso) {
  const seen = new Map();
  const add = (arr) => {
    for (const s of arr) {
      if (!s.url_resolved || !/^https:\/\//i.test(s.url_resolved)) continue;
      if (Number(s.lastcheckok) !== 1) continue;
      if (isNonMusic(s)) continue;
      if (seen.has(s.stationuuid)) continue;
      seen.set(s.stationuuid, s);
    }
  };

  await withMirror((m) =>
    getJSON(m, `/json/stations/search?countrycode=${iso}&hidebroken=true&order=votes&reverse=true&limit=60`)
  ).then(add).catch(() => {});

  for (const tag of GENRE_TAGS) {
    await withMirror((m) =>
      getJSON(m, `/json/stations/search?countrycode=${iso}&tag=${tag}&hidebroken=true&order=votes&reverse=true&limit=8`)
    ).then(add).catch(() => {});
  }

  const list = [...seen.values()].sort((a, b) => {
    const aScore = Math.min(a.votes || 0, 3000) / 50 + Math.min(a.bitrate || 0, 320) / 40;
    const bScore = Math.min(b.votes || 0, 3000) / 50 + Math.min(b.bitrate || 0, 320) / 40;
    return bScore - aScore;
  });

  // 按 host 去重，限制候选 30 条
  const dedup = [];
  const seenHost = new Set();
  for (const s of list) {
    const host = (s.url_resolved || '').replace(/^https?:\/\//, '').split('/')[0];
    if (seenHost.has(host)) continue;
    seenHost.add(host);
    dedup.push(s);
  }
  const cands = dedup.slice(0, 30);

  // 并发验证（每批 12 条），保留 20 条
  const good = [];
  for (let i = 0; i < cands.length && good.length < 20; i += 12) {
    const batch = cands.slice(i, i + 12);
    const results = await Promise.all(batch.map(async (s) => ((await verify(s.url_resolved)) ? s : null)));
    for (const r of results) {
      if (r && good.length < 20) good.push(r);
    }
  }

  return good.map((s) => ({
    name: (s.name || '').trim(),
    url: s.url_resolved,
    homepage: s.homepage || '',
    codec: s.codec || '',
    bitrate: s.bitrate || 0,
    hls: isHlsUrl(s.url_resolved),
    tags: (s.tags || '').trim(),
    votes: s.votes || 0,
    countrycode: s.countrycode || '',
    stationuuid: s.stationuuid || '',
  }));
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT, 'utf8'));
  const only = process.argv[2]; // 可选：只跑某个 ISO
  const targets = only ? [only] : TARGETS;
  let done = 0;
  for (const iso of targets) {
    try {
      const before = (existing[iso] || []).length;
      const list = await collect(iso);
      // 只有采到更多才覆盖；否则保留原有
      if (list.length > before) {
        existing[iso] = list;
      } else if (list.length > 0) {
        // 合并：保留原有 + 新增（去重 url）
        const merged = new Map();
        for (const r of [...(existing[iso] || []), ...list]) {
          if (!merged.has(r.url)) merged.set(r.url, r);
        }
        existing[iso] = [...merged.values()];
      }
      done++;
      console.log(`${iso}: ${before} → ${(existing[iso] || []).length} 条 (新增 ${list.length} 验证通过)`);
    } catch (e) {
      console.log(`${iso}: ERROR ${e.message}`);
    }
  }
  writeFileSync(OUT, JSON.stringify(existing, null, 2));
  console.log(`\n完成 ${done}/${targets.length} 国，已写入 ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
