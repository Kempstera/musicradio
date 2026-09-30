// 精确清理：仅移除「确定性失效」的电台流（HTTP 错误 / 返回 HTML 错误页）
// 不因探测超时（AbortError，多为流启动慢或沙箱网络延迟）误删，保留 radio-browser 已标记 lastcheckok=1 的流
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = join(__dirname, '..', 'src', 'data', 'radios.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function probe(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => { try { ac.abort(); } catch { /* noop */ } }, 15000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': '*/*', 'Icy-MetaData': '1' },
      signal: ac.signal,
      redirect: 'follow',
    });
    const status = res.status;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    // 读取前 2KB
    const reader = res.body?.getReader();
    let bytes = 0;
    let firstChunk = '';
    if (reader) {
      try {
        while (bytes < 2048) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) { bytes += value.length; if (firstChunk.length < 200) firstChunk += Buffer.from(value).toString('utf8', 0, Math.min(value.length, 200)); }
        }
      } catch { /* 流被中断，视为已连上 */ }
      try { await reader.cancel(); } catch { /* noop */ }
    }
    // 确定性失效：HTTP 错误码，或返回 HTML/JSON 错误页
    const isHtmlError = type.includes('text/html') || type.includes('application/json') || (type.includes('text/plain') && bytes === 0);
    const definiteBad = status >= 400 || isHtmlError;
    return { url, status, type, bytes, definiteBad };
  } catch (e) {
    // 超时 / 网络中断：视为「不确定」，保留
    return { url, status: 0, type: '', bytes: 0, definiteBad: false, inconclusive: true };
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
  console.log(`待探测电台流：${all.length} 个，并发探测中...\n`);

  const CONCURRENCY = 30;
  const results = new Array(all.length);
  let idx = 0;
  async function worker() {
    while (idx < all.length) {
      const i = idx++;
      results[i] = await probe(all[i].url);
      if (results[i].definiteBad) process.stdout.write('B');
      else process.stdout.write('.');
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n\n');

  const badUrls = new Set(results.filter((r) => r.definiteBad).map((r) => r.url));
  const badDetail = results.filter((r) => r.definiteBad);
  const inconclusive = results.filter((r) => r.inconclusive);

  console.log(`确定性失效：${badDetail.length}，超时未定（保留）：${inconclusive.length}\n`);
  for (const r of badDetail) {
    const item = all[results.indexOf(r)];
    console.log(`  [${item.key}] ${item.name} | ${r.url.slice(0, 70)} | ${r.status} ${r.type}`);
  }

  // 重建，仅移除确定性失效流
  let removed = 0;
  const out = {};
  for (const [key, list] of Object.entries(data)) {
    const kept = list.filter((s) => !badUrls.has(s.url));
    removed += list.length - kept.length;
    out[key] = kept;
  }
  writeFileSync(IN, JSON.stringify(out, null, 2));
  console.log(`\n已写入 ${IN}：移除 ${removed} 条确定性失效流，保留 ${all.length - removed} 条`);
}

main().catch((e) => { console.error(e); process.exit(1); });
