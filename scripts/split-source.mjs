// 把 source.json 按国家切片为多个分片，供并行翻译（每个分片一个 agent）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'src', 'data', 'i18n');
const partsDir = join(dir, 'parts');

const src = JSON.parse(readFileSync(join(dir, 'source.json'), 'utf8'));
const slugs = Object.keys(src);

const SHARD_SIZE = Number(process.argv[2] || 39);
mkdirSync(partsDir, { recursive: true });

const shards = [];
for (let i = 0; i < slugs.length; i += SHARD_SIZE) {
  shards.push(slugs.slice(i, i + SHARD_SIZE));
}

shards.forEach((chunk, i) => {
  const obj = {};
  for (const slug of chunk) obj[slug] = src[slug];
  writeFileSync(join(partsDir, `_src-${i}.json`), JSON.stringify(obj, null, 2), 'utf8');
});

console.log(`已切分为 ${shards.length} 个分片，每个约 ${SHARD_SIZE} 国`);
shards.forEach((c, i) => console.log(`  _src-${i}.json  →  ${c.length} 国（${c[0]} … ${c[c.length - 1]}）`));
