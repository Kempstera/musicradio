// 将 backfill-map 中 score>=85 的高质量匹配写回 regions/*.ts 的 notableRadios 条目
// 用法：node scripts/apply-backfill.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REGIONS = join(ROOT, 'src', 'data', 'regions');

// 黑名单：score 达到阈值但实际是错误匹配（张冠李戴 / 子频道）
const EXCLUDE = new Set([
  'bulgaria::Radio Bulgaria',          // 匹配到 SWEET RADIO（流行台）
  'moldova::Radio Moldova',            // 匹配到 Tineret（青年台子频道）
  'portugal::Antena 2',                // 匹配到 Antena 2 Jazzin（爵士子频道）
  'united-kingdom::Classic FM',        // 匹配到 Classic FM Calm（放松子频道）
]);

const MIN_SCORE = 85;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const eu = JSON.parse(readFileSync('/tmp/backfill-map-eu.json', 'utf8'));
  const am = JSON.parse(readFileSync('/tmp/backfill-map.json', 'utf8'));
  const merged = { ...eu, ...am };

  // 构建写回清单：slug -> [{ name, url, hls }]
  const bySlug = new Map();
  for (const [slug, entries] of Object.entries(merged)) {
    for (const e of entries) {
      if (e.score < MIN_SCORE) continue;
      if (EXCLUDE.has(`${slug}::${e.name}`)) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push({ name: e.name, url: e.url, hls: e.hls });
    }
  }

  const files = ['europe1.ts', 'europe2.ts', 'americas.ts', 'africa.ts', 'asia.ts', 'oceania.ts'];
  let applied = 0;
  const skipped = [];

  for (const fn of files) {
    const path = join(REGIONS, fn);
    let t = readFileSync(path, 'utf8');
    const original = t;

    for (const [slug, targets] of bySlug) {
      // 动态定位 slug（基于当前已修改的 t，避免错位）
      const slugIdx = t.indexOf(`slug: '${slug}'`);
      if (slugIdx < 0) {
        for (const w of targets) skipped.push(`${fn}::${slug}::${w.name} (文件内无此 slug)`);
        continue;
      }
      const nextIdx = t.indexOf(`slug: '`, slugIdx + 1);
      const blockEnd = nextIdx < 0 ? t.length : nextIdx;

      let block = t.slice(slugIdx, blockEnd);
      let changed = false;
      for (const w of targets) {
        const re = new RegExp(`(name:\\s*'${escapeRe(w.name)}'\\s*,[^}]*?)(})`);
        const m = block.match(re);
        if (!m) {
          skipped.push(`${fn}::${slug}::${w.name} (未找到条目)`);
          continue;
        }
        if (m[1].includes('url:')) {
          skipped.push(`${fn}::${slug}::${w.name} (已有 url)`);
          continue;
        }
        block = block.replace(re, `${m[1]}, url: '${w.url}', hls: ${w.hls}${m[2]}`);
        changed = true;
        applied++;
        console.log(`✓ ${fn} | ${slug} | ${w.name} → ${w.url}`);
      }
      if (changed) {
        t = t.slice(0, slugIdx) + block + t.slice(blockEnd);
      }
    }

    if (t !== original) writeFileSync(path, t);
  }

  console.log(`\n写回 ${applied} 条`);
  if (skipped.length) {
    console.log(`跳过 ${skipped.length} 条：`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

main();
