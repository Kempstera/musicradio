// 从 source.json 生成繁体中文（zh-TW）翻译文件（opencc 简繁转换）
import * as OpenCC from 'opencc-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'i18n', 'source.json'), 'utf8'));

const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);

const out = {};
for (const slug in src) {
  const c = src[slug];
  out[slug] = {
    name: T(c.name),
    intro: T(c.intro),
    history: c.history.map(T),
    music: c.music.map(T),
    musicians: c.musicians.map((m) => ({ name: T(m.name), role: T(m.role), desc: T(m.desc) })),
    radios: c.radios.map((r) => ({ name: T(r.name), genre: T(r.genre), note: T(r.note) })),
    radioNote: T(c.radioNote),
  };
}

const outFile = join(__dirname, '..', 'src', 'data', 'i18n', 'zh-TW.json');
writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
console.log(`已生成繁体中文翻译 ${Object.keys(out).length} 国 → ${outFile}`);
