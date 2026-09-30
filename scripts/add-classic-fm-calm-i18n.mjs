// 一次性：给各语言 i18n 的 united-kingdom.radios 插入 "Classic FM Calm" 条目（在 Classic FM 之后、Jazz FM 之前）
import * as OpenCC from 'opencc-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'src', 'data', 'i18n');

const zhCN = {
  name: 'Classic FM Calm',
  genre: '古典 / 放松',
  note: '英国 Classic FM 的放松副频道，精选舒缓古典与氛围曲目。',
};

const LANGS = {
  en: { name: 'Classic FM Calm', genre: 'Classical / Relaxing', note: "A relaxing sub-channel of Classic FM UK, curated with soothing classical and ambient tracks." },
  cy: { name: 'Classic FM Calm', genre: 'clasurol / ymlacio', note: "Is-sianel ymlaciol o Classic FM y DU, yn curadu traciau clasurol tawel ac awyrgylchol." },
  fr: { name: 'Classic FM Calm', genre: 'Classique / Relaxation', note: 'Une sous-chaîne relaxante de Classic FM UK, avec une sélection de titres classiques apaisants.' },
  de: { name: 'Classic FM Calm', genre: 'Klassik / Entspannung', note: 'Ein entspannter Ableger von Classic FM UK mit einer Auswahl beruhigender klassischer Stücke.' },
  it: { name: 'Classic FM Calm', genre: 'Classica / Relax', note: 'Un canale rilassante di Classic FM UK, con una selezione di brani classici distensivi.' },
  es: { name: 'Classic FM Calm', genre: 'Clásica / Relajación', note: 'Un canal relajante de Classic FM UK, con una selección de piezas clásicas serenas.' },
};

function writeJSON(path, data, pretty) {
  writeFileSync(path, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');
}

function insertInto(radios, entry) {
  const idx = radios.findIndex((r) => r.name === 'Jazz FM');
  const out = [...radios];
  if (idx === -1) {
    out.push(entry);
  } else {
    out.splice(idx, 0, entry);
  }
  return out;
}

// 1. source.json（多行缩进）——已由 Edit 工具手动完成，这里仅校验
const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
if (!src['united-kingdom'].radios.some((r) => r.name === 'Classic FM Calm')) {
  src['united-kingdom'].radios = insertInto(src['united-kingdom'].radios, zhCN);
  writeJSON(join(DIR, 'source.json'), src, true);
  console.log('source.json: 已插入 Classic FM Calm');
} else {
  console.log('source.json: 已存在 Classic FM Calm，跳过');
}

// 2. zh-TW.json（单行 + opencc 简繁）
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const tw = JSON.parse(readFileSync(join(DIR, 'zh-TW.json'), 'utf8'));
const twEntry = { name: T(zhCN.name), genre: T(zhCN.genre), note: T(zhCN.note) };
if (!tw['united-kingdom'].radios.some((r) => r.name === twEntry.name)) {
  tw['united-kingdom'].radios = insertInto(tw['united-kingdom'].radios, twEntry);
  writeJSON(join(DIR, 'zh-TW.json'), tw, false);
  console.log('zh-TW.json: 已插入');
} else {
  console.log('zh-TW.json: 已存在，跳过');
}

// 3. 其余 6 语言（单行）
for (const [lang, entry] of Object.entries(LANGS)) {
  const file = join(DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  if (!d['united-kingdom'].radios.some((r) => r.name === 'Classic FM Calm')) {
    d['united-kingdom'].radios = insertInto(d['united-kingdom'].radios, entry);
    writeJSON(file, d, false);
    console.log(`${lang}.json: 已插入`);
  } else {
    console.log(`${lang}.json: 已存在，跳过`);
  }
}

console.log('完成。');
