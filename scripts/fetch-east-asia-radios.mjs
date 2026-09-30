// 针对日韩蒙朝补充可播放音乐电台，写入 src/data/radios.json（替换 JP/KR/MN/KP）
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

const TARGETS = ['JP', 'KR', 'MN', 'KP'];

const GENRE_TAGS = ['japanese', 'kpop', 'korean', 'classical', 'jazz', 'anime', 'citypop', 'pop', 'folk', 'culture'];

// 非音乐/宗教/非本条目黑名单
const NON_MUSIC_PATTERNS = [
  /\btv\b/i, /television/i,
  /quran/i, /koran/i, /قرآن/i, /古兰经/i, /abdulbasit/i, /abdul\s*basit/i,
  /islam/i, /islamic/i, /muslim/i, /mosque/i, /masjid/i,
  /bible/i, /scripture/i, /sermon/i, /preaching/i, /devotional/i,
  /christian/i, /catholic/i, /orthodox/i, /church/i, /gospel/i, /family radio/i,
  /religion/i, /religious/i, /prayer/i, /adhan/i, /azan/i, /recitation/i, /sheikh/i, /mufti/i, /\bimam\b/i,
  // 蒙古国结果里混入的中国内蒙古台，剔除
  /内蒙古|inner mongolia|Inner Mongolia/i,
];

function isNonMusic(s) {
  const text = `${s.name || ''} ${s.tags || ''}`;
  return NON_MUSIC_PATTERNS.some((re) => re.test(text));
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

function isPlayable(s) {
  if (!s.url_resolved) return false;
  if (Number(s.lastcheckok) !== 1) return false;
  const codec = (s.codec || '').toUpperCase();
  const url = (s.url_resolved || '').toLowerCase();
  const isHls = s.hls === 1 || s.hls === true || url.includes('.m3u8');
  return codec.includes('MP3') || codec.includes('AAC') || codec.includes('OGG') || codec.includes('OPUS') || isHls;
}

function normalize(s) {
  return {
    name: (s.name || '').trim(),
    url: s.url_resolved,
    homepage: s.homepage || '',
    codec: s.codec || '',
    bitrate: s.bitrate || 0,
    hls: s.hls === 1 || s.hls === true || (s.url_resolved || '').toLowerCase().includes('.m3u8'),
    tags: (s.tags || '').trim(),
    votes: s.votes || 0,
    countrycode: s.countrycode || '',
  };
}

async function collectCountry(iso) {
  const seen = new Map();
  const add = (arr) => {
    for (const s of arr) {
      if (!isPlayable(s)) continue;
      if (isNonMusic(s)) continue;
      if (seen.has(s.stationuuid)) continue;
      seen.set(s.stationuuid, normalize(s));
    }
  };

  await withMirror((m) =>
    getJSON(m, `/json/stations/search?countrycode=${iso}&hidebroken=true&order=votes&reverse=true&limit=40`)
  ).then(add).catch(() => {});

  for (const tag of GENRE_TAGS) {
    await withMirror((m) =>
      getJSON(m, `/json/stations/search?countrycode=${iso}&tag=${tag}&hidebroken=true&order=votes&reverse=true&limit=6`)
    ).then(add).catch(() => {});
  }

  const list = [...seen.values()].sort((a, b) => {
    const aScore = (a.hls ? -1 : 0) + Math.min(a.votes, 2000) / 100 + Math.min(a.bitrate, 320) / 50;
    const bScore = (b.hls ? -1 : 0) + Math.min(b.votes, 2000) / 100 + Math.min(b.bitrate, 320) / 50;
    return bScore - aScore;
  });

  // 按 URL 去重（同一流多个条目，如 KP 的 myradio24 重复）
  const dedup = [];
  const seenUrl = new Set();
  for (const s of list) {
    const key = s.url.replace(/^https?:\/\//, '').split('/')[0] + s.url.replace(/[?#].*$/, '');
    if (seenUrl.has(key)) continue;
    seenUrl.add(key);
    dedup.push(s);
  }
  return dedup.slice(0, 12);
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT, 'utf8'));
  for (const iso of TARGETS) {
    try {
      const list = await collectCountry(iso);
      existing[iso] = list;
      console.log(`${iso}: ${list.length} stations`);
      list.forEach((s) => console.log(`   - ${s.name} | ${s.hls ? 'HLS' : s.codec} | ${s.url.slice(0, 55)}`));
    } catch (e) {
      console.log(`${iso}: ERROR ${e.message}`);
    }
  }
  writeFileSync(OUT, JSON.stringify(existing, null, 2));
  console.log(`\n已写入 ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
