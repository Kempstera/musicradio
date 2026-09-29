// 批量验证 radios.json 中的电台流是否真实可播放
// 对每个 URL 发 GET，读取前几个字节，检查 HTTP 状态、Content-Type 与实际数据
// 用法：node scripts/verify-radios.mjs [--fix]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = join(__dirname, '..', 'src', 'data', 'radios.json');
const FIX = process.argv.includes('--fix');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// 合法的音频/流 Content-Type
const OK_TYPES = [
  'audio/mpeg', 'audio/aac', 'audio/aacp', 'audio/mp3', 'audio/x-mpeg',
  'audio/ogg', 'audio/opus', 'audio/mp4', 'audio/x-wav', 'audio/wav',
  'audio/x-hls', 'application/vnd.apple.mpegurl', 'application/x-mpegurl',
  'application/mpegurl', 'application/octet-stream', 'video/mp2t',
  'audio/x-aac', 'audio/mp4a-latm', 'audio/webm',
];

function looksLikeAudio(type) {
  if (!type) return true; // 无 Content-Type 时进一步看数据
  const t = type.toLowerCase().split(';')[0].trim();
  return OK_TYPES.includes(t);
}

// 明显的错误 Content-Type（HTML / JSON 错误页）
function looksLikeError(type) {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('text/html') || t.includes('application/json') || t.includes('text/plain');
}

async function probe(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => {
    try { ac.abort(); } catch { /* noop */ }
  }, 9000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': '*/*', 'Icy-MetaData': '1' },
      signal: ac.signal,
      redirect: 'follow',
    });
    const status = res.status;
    const type = res.headers.get('content-type') || '';
    // 读取前几 KB
    const reader = res.body?.getReader();
    let bytes = 0;
    let firstChunk = '';
    if (reader) {
      try {
        while (bytes < 4096) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bytes += value.length;
            if (firstChunk.length < 200) firstChunk += Buffer.from(value).toString('utf8', 0, Math.min(value.length, 200));
          }
        }
      } catch { /* 流被中断/取消，视为已连上 */ }
      try { await reader.cancel(); } catch { /* noop */ }
    }

    const okStatus = status >= 200 && status < 400;
    const isHlsText = type.toLowerCase().includes('mpegurl') && firstChunk.startsWith('#EXTM3U');
    const isAudio = looksLikeAudio(type);
    const isError = looksLikeError(type);
    const ok = okStatus && !isError && (isAudio || isHlsText || bytes > 0);

    return { ok, status, type, bytes };
  } catch (e) {
    return { ok: false, status: 0, type: '', bytes: 0, error: e.name || 'error' };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const data = JSON.parse(readFileSync(IN, 'utf8'));
  const all = [];
  for (const [key, list] of Object.entries(data)) {
    for (const s of list) all.push({ key, ...s });
  }
  console.log(`待验证电台流：${all.length} 个，并发探测中...\n`);

  const CONCURRENCY = 25;
  const results = new Array(all.length);
  let idx = 0;

  async function worker() {
    while (idx < all.length) {
      const i = idx++;
      const s = all[i];
      const r = await probe(s.url);
      results[i] = { ...s, probe: r };
      if (r.ok) process.stdout.write('.');
      else process.stdout.write('x');
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  process.stdout.write('\n\n');

  const bad = results.filter((r) => !r.probe.ok);
  const good = results.filter((r) => r.probe.ok);

  console.log(`有效：${good.length}，失效：${bad.length}\n`);
  console.log('--- 失效清单（前 60 条）---');
  for (const r of bad.slice(0, 60)) {
    const err = r.probe.error ? ` ${r.probe.error}` : '';
    console.log(`  [${r.key}] ${r.name} | ${r.url.slice(0, 70)} | ${r.probe.status} ${r.probe.type}${err}`);
  }
  if (bad.length > 60) console.log(`  ... 其余 ${bad.length - 60} 条略`);

  if (FIX) {
    // 重建 radios.json，仅保留有效流
    const goodUrls = new Set(good.map((r) => r.url));
    const out = {};
    let removedCount = 0;
    for (const [key, list] of Object.entries(data)) {
      const kept = list.filter((s) => goodUrls.has(s.url));
      removedCount += list.length - kept.length;
      out[key] = kept;
    }
    writeFileSync(IN, JSON.stringify(out, null, 2));
    console.log(`\n已写入 ${IN}：移除 ${removedCount} 条失效流`);
  } else {
    console.log(`\n（预览模式。加 --fix 参数可实际移除失效流）`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
