// 为非洲 54 个主权国家逐个采集可播放的音乐电台，写入 src/data/radios.json
// 与 fetch-radios.mjs 的区别：按国家 ISO 采集（而非旧的 5 个大区合并 key），并强化宗教电台过滤
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
  'https://fi1.api.radio-browser.info',
];

// 非洲 54 个主权国家 ISO（按大洲页面 slug 对应）
const AFRICA_ISO = [
  // 北非
  'MA', 'DZ', 'TN', 'LY', 'EG', 'SD',
  // 西非
  'NG', 'GH', 'SN', 'ML', 'CI', 'GN', 'BF', 'NE', 'BJ', 'TG', 'SL', 'LR', 'GM', 'GW', 'CV', 'MR',
  // 东非
  'ET', 'KE', 'TZ', 'UG', 'RW', 'BI', 'SO', 'DJ', 'ER', 'SS', 'SC', 'KM', 'MG', 'MU',
  // 中非
  'CM', 'CD', 'CG', 'GA', 'CF', 'TD', 'GQ', 'ST', 'AO',
  // 南部非洲
  'ZA', 'NA', 'BW', 'LS', 'SZ', 'ZW', 'ZM', 'MW', 'MZ',
];

// 旧的大区合并 key（不再被页面引用，采集后移除）
const OLD_REGION_KEYS = ['north-africa', 'west-africa', 'east-africa', 'central-africa', 'southern-africa'];

// 用于丰富曲风的标签（非洲地区有效标签较少，多取几类）
const GENRE_TAGS = ['african', 'afro', 'reggae', 'jazz', 'classical', 'pop', 'folk', 'world', 'culture', 'news'];

// 非音乐 / 宗教条目黑名单（命中即剔除）
const NON_MUSIC_PATTERNS = [
  /\btv\b/i, /television/i,        // 电视伴音
  /quran/i, /koran/i, /kor'an/i, /قرآن/i, /古兰经/i,   // 古兰经诵读
  /abdulbasit/i, /abdul\s*basit/i, /abdul\s*baset/i,    // 诵经名家
  /islam/i, /islamic/i, /muslim/i, /mosque/i, /masjid/i, // 伊斯兰
  /bible/i, /scripture/i, /evangelio/i, /sermon/i, /preaching/i, /devotional/i,
  /christian/i, /catholic/i, /orthodox/i, /church/i, /gospel/i,  // 基督教
  /religion/i, /religious/i,
  /prayer/i, /adhan/i, /adhān/i, /azan/i, /recitation/i, /tajwid/i, // 祈祷 / 宣礼 / 诵念
  /sheikh/i, /mufti/i, /\bimam\b/i,  // 宗教人物称谓
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
    try {
      return await fn(m);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function isPlayable(s) {
  if (!s.url_resolved) return false;
  if (Number(s.lastcheckok) !== 1) return false;
  const codec = (s.codec || '').toUpperCase();
  const okCodec = codec.includes('MP3') || codec.includes('AAC') || codec.includes('OGG') || codec.includes('OPUS') || s.hls === 1 || s.hls === true;
  return okCodec;
}

function normalize(s) {
  return {
    name: (s.name || '').trim(),
    url: s.url_resolved,
    homepage: s.homepage || '',
    codec: s.codec || '',
    bitrate: s.bitrate || 0,
    hls: s.hls === 1 || s.hls === true,
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

  // 综合热门（主来源，limit 放宽到 30）
  await withMirror((m) =>
    getJSON(m, `/json/stations/search?countrycode=${iso}&hidebroken=true&order=votes&reverse=true&limit=30`)
  ).then(add).catch(() => {});

  // 分曲风补充
  for (const tag of GENRE_TAGS) {
    await withMirror((m) =>
      getJSON(m, `/json/stations/search?countrycode=${iso}&tag=${tag}&hidebroken=true&order=votes&reverse=true&limit=5`)
    ).then(add).catch(() => {});
  }

  // 按热度排序，优先直连 mp3/aac
  const list = [...seen.values()].sort((a, b) => {
    const aScore = (a.hls ? -2 : 0) + Math.min(a.votes, 2000) / 100 + Math.min(a.bitrate, 320) / 50;
    const bScore = (b.hls ? -2 : 0) + Math.min(b.votes, 2000) / 100 + Math.min(b.bitrate, 320) / 50;
    return bScore - aScore;
  });
  return list.slice(0, 12);
}

async function main() {
  const existing = JSON.parse(readFileSync(OUT, 'utf8'));

  // 移除旧的大区 key
  for (const k of OLD_REGION_KEYS) delete existing[k];

  let done = 0;
  const total = AFRICA_ISO.length;
  const summary = {};

  for (const iso of AFRICA_ISO) {
    try {
      const list = await collectCountry(iso);
      existing[iso] = list;
      summary[iso] = list.length;
      done++;
      console.log(`[${done}/${total}] ${iso}: ${list.length} stations`);
    } catch (e) {
      existing[iso] = [];
      summary[iso] = 0;
      done++;
      console.log(`[${done}/${total}] ${iso}: ERROR ${e.message}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(existing, null, 2));
  const withData = Object.entries(summary).filter(([, n]) => n > 0).length;
  const totalStations = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`\n完成：${withData}/${total} 个非洲国家有可播放音乐电台，共 ${totalStations} 个，已写入 ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
