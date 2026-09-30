// 为英法德著名音乐电台精确查找可播放流
// 目标：BBC Radio 3, Classic FM Calm, France Musique, FIP, TSF Jazz, WDR 3
// 策略：radio-browser name 精确搜索(限 iso) + 硬编码官方流候选，逐个 verify(https+200+content-type+HLS需CORS*)
import { writeFileSync } from 'node:fs';

const MIRRORS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];

const isHlsUrl = (u) => /\.m3u8/i.test(u || '');
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

async function verify(url) {
  if (!url || !/^https:\/\//i.test(url)) return { ok: false, reason: '非https' };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const cors = res.headers.get('access-control-allow-origin') || '';
    const ctOk = ct.includes('mpeg') || ct.includes('audio') || ct.includes('octet') || ct.includes('x-mpegurl') || ct.includes('mp3') || ct.includes('aac') || ct.includes('mpegurl');
    const corsOk = !isHlsUrl(url) || cors === '*';
    try { await res.body?.cancel(); } catch {}
    return { ok: res.status === 200 && ctOk && corsOk, status: res.status, ct, cors };
  } catch (e) { return { ok: false, reason: e.message }; }
}

async function search(iso, query, limit = 25) {
  try {
    for (const m of MIRRORS) {
      const res = await fetch(`${m}/json/stations/search?countrycode=${iso}&name=${encodeURIComponent(query)}&hidebroken=true&order=votes&reverse=true&limit=${limit}`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
    }
  } catch {}
  return [];
}

// 目标定义：{ iso, keys(搜索词), official(官方流候选), match(精确匹配正则) }
const TARGETS = [
  {
    iso: 'GB', key: 'BBC Radio 3', name: 'BBC Radio 3',
    official: [
      'https://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/uk/sbr_high/ak/bbc_radio_three.m3u8',
      'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_three',
    ],
    match: /bbc\s*radio\s*3/i,
  },
  {
    iso: 'GB', key: 'Classic FM Calm', name: 'Classic FM Calm',
    official: ['https://media-ice.musicradio.com/ClassicFMCalmMP3'],
    match: /classic\s*fm\s*calm/i,
  },
  {
    iso: 'FR', key: 'France Musique', name: 'France Musique',
    official: [
      'https://icecast.radiofrance.fr/francemusique-midfi.mp3',
      'https://stream.radiofrance.fr/francemusique/francemusique.m3u8',
      'https://icecast.radiofrance.fr/francemusique-hifi.aac',
    ],
    match: /france\s*musique/i,
  },
  {
    iso: 'FR', key: 'FIP', name: 'FIP',
    official: [
      'https://icecast.radiofrance.fr/fip-midfi.mp3',
      'https://stream.radiofrance.fr/fip/fip.m3u8',
      'https://icecast.radiofrance.fr/fip-hifi.aac',
    ],
    match: /^fip$/i, // 只要 FIP 主台，排除 FIP Rock/Jazz 等子频道
  },
  {
    iso: 'FR', key: 'TSF Jazz', name: 'TSF Jazz',
    official: [
      'https://tsf-jazz.ice.infomaniak.ch/tsf-jazz-high.mp3',
      'https://tsfjazz.ice.infomaniak.ch/tsfjazz-high.mp3',
    ],
    match: /tsf\s*jazz/i,
  },
  {
    iso: 'DE', key: 'WDR 3', name: 'WDR 3',
    official: [
      'https://wdr-wdr3-live.icecastssl.wdr.de/wdr/wdr3/live/mp3/128/stream.mp3',
      'https://wdr-wdr3-live.icecast.wdr.de/wdr/wdr3/live/mp3/128/stream.mp3',
    ],
    match: /^wdr\s*3/i,
  },
];

async function main() {
  const results = {};
  for (const t of TARGETS) {
    console.log(`\n=== ${t.iso} ${t.name} ===`);
    let found = null;

    // 1. 先验证官方流
    for (const u of t.official) {
      const r = await verify(u);
      console.log(`  官方流 ${u.slice(0, 90)} → ${JSON.stringify(r)}`);
      if (r.ok) { found = { name: t.name, url: u, hls: isHlsUrl(u), source: 'official' }; break; }
    }

    // 2. radio-browser 搜索
    if (!found) {
      const arr = await search(t.iso, t.key);
      console.log(`  radio-browser 命中 ${arr.length} 条`);
      for (const s of arr) {
        const nm = norm(s.name);
        const candidateName = s.name;
        // 精确匹配：norm 完全相等，或 FIP 主台特殊处理
        const exact = t.match.test(candidateName) && (!/rock|jazz|metal|electro|pop|world|nouveaut/i.test(candidateName.replace(t.key, '')) || /calm/i.test(candidateName));
        if (s.url_resolved && /^https:\/\//i.test(s.url_resolved) && Number(s.lastcheckok) === 1) {
          const r = await verify(s.url_resolved);
          console.log(`    ${candidateName} → ${s.url_resolved.slice(0,90)} ${JSON.stringify({ok:r.ok,status:r.status,ct:r.ct,cors:r.cors})}`);
          if (r.ok && !found) { found = { name: candidateName, url: s.url_resolved, hls: isHlsUrl(s.url_resolved), source: 'radio-browser' }; }
        }
      }
    }

    results[t.name] = found;
    console.log(`  → 结果: ${found ? found.url : '未找到'}`);
  }
  writeFileSync('/tmp/famous-map.json', JSON.stringify(results, null, 2));
  console.log('\n写入 /tmp/famous-map.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
