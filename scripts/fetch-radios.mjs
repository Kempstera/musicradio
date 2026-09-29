// 从 radio-browser.info 采集各国家/地区的真实可播放电台流
// 输出 src/data/radios.json  (key = ISO 或非洲大区 slug)
import { writeFileSync } from 'node:fs';
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

// 目标：country -> ISO 码；group -> 多国
const TARGETS = [
  // 欧洲
  { key: 'AL' }, { key: 'AD' }, { key: 'AT' }, { key: 'BY' }, { key: 'BE' },
  { key: 'BA' }, { key: 'BG' }, { key: 'HR' }, { key: 'CY' }, { key: 'CZ' },
  { key: 'DK' }, { key: 'EE' }, { key: 'FI' }, { key: 'FR' }, { key: 'DE' },
  { key: 'GR' }, { key: 'HU' }, { key: 'IS' }, { key: 'IE' }, { key: 'IT' },
  { key: 'LV' }, { key: 'LI' }, { key: 'LT' }, { key: 'LU' }, { key: 'MT' },
  { key: 'MD' }, { key: 'MC' }, { key: 'ME' }, { key: 'NL' }, { key: 'MK' },
  { key: 'NO' }, { key: 'PL' }, { key: 'PT' }, { key: 'RO' }, { key: 'RU' },
  { key: 'SM' }, { key: 'RS' }, { key: 'SK' }, { key: 'SI' }, { key: 'ES' },
  { key: 'SE' }, { key: 'CH' }, { key: 'UA' }, { key: 'GB' },
  { key: 'GE' }, { key: 'AM' }, { key: 'AZ' },
  // 东亚
  { key: 'CN' }, { key: 'JP' }, { key: 'KR' },
  // 西亚 / 南亚
  { key: 'TR' }, { key: 'IR' }, { key: 'IN' },
  // 东南亚
  { key: 'TH' }, { key: 'VN' }, { key: 'ID' }, { key: 'MY' }, { key: 'PH' },
  { key: 'SG' }, { key: 'MM' }, { key: 'KH' }, { key: 'LA' }, { key: 'BN' },
  { key: 'TL' },
  // 北美
  { key: 'US' }, { key: 'CA' }, { key: 'MX' },
  // 南美
  { key: 'AR' }, { key: 'BR' }, { key: 'CL' }, { key: 'CO' }, { key: 'PE' },
  { key: 'VE' }, { key: 'UY' }, { key: 'EC' }, { key: 'BO' }, { key: 'PY' },
  // 大洋洲
  { key: 'AU' }, { key: 'NZ' },
  // 非洲大区
  { key: 'north-africa', countries: ['MA', 'DZ', 'TN', 'LY', 'EG'] },
  { key: 'west-africa', countries: ['NG', 'GH', 'SN', 'ML', 'CI', 'GN', 'BF', 'NE', 'BJ', 'TG'] },
  { key: 'east-africa', countries: ['ET', 'KE', 'TZ', 'UG', 'RW', 'SD', 'SO', 'DJ', 'ER'] },
  { key: 'central-africa', countries: ['CM', 'CD', 'CG', 'GA', 'CF', 'TD', 'GQ'] },
  { key: 'southern-africa', countries: ['ZA', 'ZW', 'ZM', 'BW', 'NA', 'MZ', 'AO', 'MW', 'LS', 'SZ', 'MG'] },
];

// 用于丰富曲风的标签
const GENRE_TAGS = ['classical', 'jazz', 'folk', 'pop', 'culture', 'news'];

// 非音乐条目黑名单：电视伴音、古兰经/经文诵读、讲道等（命中即剔除）
const NON_MUSIC_PATTERNS = [
  /\btv\b/i,        // 电视（独立词，如 "News 24 TV"、"tv" tag）
  /television/i,    // 电视
  /quran/i,         // 古兰经
  /koran/i,
  /قرآن/i,
  /古兰经/i,
  /\bbible\b/i,     // 读经 / 讲道
  /scripture/i,
  /evangelio/i,
  /sermon/i,
  /preaching/i,
  /devotional/i,
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

  // 综合热门
  await withMirror((m) =>
    getJSON(m, `/json/stations/search?countrycode=${iso}&hidebroken=true&order=votes&reverse=true&limit=15`)
  ).then(add).catch(() => {});

  // 分曲风
  for (const tag of GENRE_TAGS) {
    await withMirror((m) =>
      getJSON(m, `/json/stations/search?countrycode=${iso}&tag=${tag}&hidebroken=true&order=votes&reverse=true&limit=4`)
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
  const out = {};
  let done = 0;
  const total = TARGETS.length;

  for (const t of TARGETS) {
    try {
      if (t.countries) {
        // 非洲大区：合并多国结果
        const pool = [];
        for (const iso of t.countries) {
          const r = await collectCountry(iso);
          pool.push(...r);
        }
        // 去重
        const seen = new Map();
        for (const s of pool) {
          if (!seen.has(s.url)) seen.set(s.url, s);
        }
        const list = [...seen.values()].sort((a, b) => b.votes - a.votes).slice(0, 18);
        out[t.key] = list;
      } else {
        out[t.key] = await collectCountry(t.key);
      }
      done++;
      console.log(`[${done}/${total}] ${t.key}: ${out[t.key].length} stations`);
    } catch (e) {
      done++;
      out[t.key] = [];
      console.log(`[${done}/${total}] ${t.key}: ERROR ${e.message}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  const counts = Object.entries(out).filter(([, v]) => v.length > 0).length;
  console.log(`\n完成：${counts}/${total} 个目标有电台数据，已写入 ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
