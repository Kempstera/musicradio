// 把 src/data/regions/*.ts 里的国家正文内容提取为结构化 JSON，供翻译/校验使用
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 用 esbuild 把数据打包成 CJS，再 require 出 allCountries
const entry = join(ROOT, 'src', 'data', 'index.ts');
const outfile = join('/tmp', 'data-bundle.cjs');
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});

const { allCountries } = await import(outfile);

// 提取需要翻译的字段
const content = {};
for (const c of allCountries) {
  content[c.slug] = {
    name: c.name,
    intro: c.intro,
    history: c.history || [],
    music: c.music || [],
    musicians: (c.musicians || []).map((m) => ({
      name: m.name,
      nameEn: m.nameEn || '',
      role: m.role,
      desc: m.desc,
    })),
    radios: (c.notableRadios || []).map((r) => ({
      name: r.name,
      genre: r.genre,
      note: r.note || '',
    })),
    radioNote: c.radioNote || '',
  };
}

const outDir = join(ROOT, 'src', 'data', 'i18n');
mkdirSync(outDir, { recursive: true });
const outJson = join(outDir, 'source.json');
writeFileSync(outJson, JSON.stringify(content, null, 2), 'utf8');

const n = Object.keys(content).length;
let total = 0;
for (const k in content) {
  total += content[k].intro.length;
  content[k].history.forEach((x) => (total += x.length));
  content[k].music.forEach((x) => (total += x.length));
  content[k].musicians.forEach((x) => (total += x.desc.length + x.role.length + x.name.length));
  content[k].radios.forEach((x) => (total += (x.note || '').length));
  total += (content[k].radioNote || '').length;
}
console.log(`已导出 ${n} 个国家到 ${outJson}`);
console.log(`待翻译正文总量 ≈ ${total} 字符`);
