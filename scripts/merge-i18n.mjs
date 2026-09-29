// 合并各语言的分片 JSON（parts/<lang>-NN.json）为最终 <lang>.json
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'src', 'data', 'i18n');
const partsDir = join(dir, 'parts');

const langs = ['en', 'cy', 'fr', 'de', 'it', 'es'];

for (const lang of langs) {
  if (!existsSync(partsDir)) continue;
  const files = readdirSync(partsDir)
    .filter((f) => f.startsWith(`${lang}-`) && f.endsWith('.json'))
    .sort();
  if (!files.length) continue;
  const merged = {};
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(partsDir, f), 'utf8'));
    Object.assign(merged, data);
  }
  writeFileSync(join(dir, `${lang}.json`), JSON.stringify(merged, null, 2), 'utf8');
  console.log(`${lang}.json <- ${files.length} 分片，共 ${Object.keys(merged).length} 国`);
}
