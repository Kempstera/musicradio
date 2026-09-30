// 探测并修复 http 流：可升级的换 https，不可升级的删除（https 页面无法播放 http 流）
// 用法：node scripts/http-to-https.mjs [--apply]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src', 'data', 'radios.json');

const APPLY = process.argv.includes('--apply');
const isHlsUrl = (u) => /\.m3u8/i.test(u || '');

async function verify(url) {
  if (!url || !/^https:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const cors = res.headers.get('access-control-allow-origin') || '';
    const ctOk = ct.includes('mpeg') || ct.includes('audio') || ct.includes('octet') || ct.includes('x-mpegurl') || ct.includes('mp3') || ct.includes('aac') || ct.includes('mpegurl');
    const corsOk = !isHlsUrl(url) || cors === '*';
    try { await res.body?.cancel(); } catch {}
    return res.status === 200 && ctOk && corsOk;
  } catch { return false; }
}

async function main() {
  const d = JSON.parse(readFileSync(OUT, 'utf8'));

  // 收集所有 http 流（按 url 去重，因为同一 url 可能出现在多个国家）
  const httpUrls = new Map(); // url -> httpsUrl
  for (const arr of Object.values(d)) {
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      if (s.url && /^http:\/\//i.test(s.url)) {
        httpUrls.set(s.url, s.url.replace(/^http:\/\//i, 'https://'));
      }
    }
  }
  console.log(`http 流去重后: ${httpUrls.size} 条`);

  // 并发验证每个 http 流的 https 升级
  const verifyMap = new Map(); // url -> boolean (https 可用)
  const entries = [...httpUrls.entries()];
  const BATCH = 15;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async ([url, httpsUrl]) => [url, await verify(httpsUrl)]));
    for (const [url, ok] of results) verifyMap.set(url, ok);
    const done = Math.min(i + BATCH, entries.length);
    process.stdout.write(`\r验证进度 ${done}/${entries.length}`);
  }
  console.log('');

  let upgraded = 0, removed = 0;
  // 应用：重建每个国家的数组（用 url 定位，避免 idx 错位）
  for (const iso of Object.keys(d)) {
    if (!Array.isArray(d[iso])) continue;
    const newArr = [];
    for (const s of d[iso]) {
      if (s.url && /^http:\/\//i.test(s.url)) {
        if (verifyMap.get(s.url)) {
          s.url = s.url.replace(/^http:\/\//i, 'https://');
          newArr.push(s);
          upgraded++;
        } else {
          removed++;
        }
      } else {
        newArr.push(s);
      }
    }
    d[iso] = newArr;
  }

  console.log(`可升级 https: ${upgraded}, 删除 http-only: ${removed}`);

  if (APPLY) {
    writeFileSync(OUT, JSON.stringify(d, null, 2));
    let total = 0, http = 0;
    for (const arr of Object.values(d)) {
      if (!Array.isArray(arr)) continue;
      for (const s of arr) { total++; if (/^http:\/\//i.test(s.url)) http++; }
    }
    console.log(`已写入。最终电台总数 ${total}, 剩余 http 流 ${http}`);
  } else {
    console.log('（试运行，未写入。加 --apply 应用）');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
