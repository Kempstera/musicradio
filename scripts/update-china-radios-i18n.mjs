// 同步中国（china）notableRadios 中 3 个台湾台的 name/genre/note 到 8 语言 i18n
// 索引：9=台北广播电台（原台中古典）、11=桃园GO（原台北流行）、12=正声FM104（原Hit FM）
import * as OpenCC from 'opencc-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'src', 'data', 'i18n');

const zhCN = {
  9: { name: '台北广播电台（Taipei Broadcasting Station，中国台湾）', genre: '综合 / 音乐', note: '台北市的公共广播电台，播放综合与音乐节目。' },
  11: { name: '桃园GO GO104.3（中国台湾）', genre: '流行', note: '中国台湾桃园的流行音乐电台。' },
  12: { name: '正声广播电台 FM104（中国台湾）', genre: '综合 / 音乐', note: '中国台湾的综合广播电台，播放音乐与生活节目。' },
};

const LANGS = {
  en: {
    9: { name: 'Taipei Broadcasting Station (Taiwan, China)', genre: 'General / Music', note: 'Public broadcaster of Taipei City, airing general and music programmes.' },
    11: { name: 'Taoyuan GO GO104.3 (Taiwan, China)', genre: 'Pop', note: 'A pop music station based in Taoyuan, Taiwan, China.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taiwan, China)', genre: 'General / Music', note: 'A general broadcaster in Taiwan, China, airing music and lifestyle programmes.' },
  },
  cy: {
    9: { name: 'Taipei Broadcasting Station (Taiwan, Tsieina)', genre: 'Cyffredinol / Cerddoriaeth', note: "Darlledwr cyhoeddus Dinas Taipei, yn darlledu rhaglenni cyffredinol a cherddoriaeth." },
    11: { name: 'Taoyuan GO GO104.3 (Taiwan, Tsieina)', genre: 'Pop', note: 'Gorsaf gerddoriaeth boblogaidd wedi\'i lleoli yn Taoyuan, Taiwan, Tsieina.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taiwan, Tsieina)', genre: 'Cyffredinol / Cerddoriaeth', note: "Darlledwr cyffredinol yn Taiwan, Tsieina, yn darlledu cerddoriaeth a rhaglenni ffordd o fyw." },
  },
  fr: {
    9: { name: 'Taipei Broadcasting Station (Taïwan, Chine)', genre: 'Généraliste / Musique', note: 'Radiodiffuseur public de la ville de Taipei, diffusant des programmes généralistes et musicaux.' },
    11: { name: 'Taoyuan GO GO104.3 (Taïwan, Chine)', genre: 'Pop', note: 'Une station de musique pop basée à Taoyuan, à Taïwan, en Chine.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taïwan, Chine)', genre: 'Généraliste / Musique', note: 'Un radiodiffuseur généraliste à Taïwan, en Chine, diffusant musique et programmes de vie.' },
  },
  de: {
    9: { name: 'Taipei Broadcasting Station (Taiwan, China)', genre: 'Allgemein / Musik', note: 'Öffentlich-rechtlicher Sender der Stadt Taipeh mit allgemeinen und Musikprogrammen.' },
    11: { name: 'Taoyuan GO GO104.3 (Taiwan, China)', genre: 'Pop', note: 'Ein Popsender aus Taoyuan, Taiwan, China.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taiwan, China)', genre: 'Allgemein / Musik', note: 'Ein allgemeiner Sender in Taiwan, China, mit Musik- und Lifestyle-Programmen.' },
  },
  it: {
    9: { name: 'Taipei Broadcasting Station (Taiwan, Cina)', genre: 'Generalista / Musica', note: 'Emittente pubblica della città di Taipei, con programmi generalisti e musicali.' },
    11: { name: 'Taoyuan GO GO104.3 (Taiwan, Cina)', genre: 'Pop', note: 'Una stazione di musica pop con sede a Taoyuan, Taiwan, Cina.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taiwan, Cina)', genre: 'Generalista / Musica', note: 'Un\'emittente generalista a Taiwan, Cina, con musica e programmi di lifestyle.' },
  },
  es: {
    9: { name: 'Taipei Broadcasting Station (Taiwán, China)', genre: 'Generalista / Música', note: 'Emisora pública de la ciudad de Taipéi, con programas generalistas y musicales.' },
    11: { name: 'Taoyuan GO GO104.3 (Taiwán, China)', genre: 'Pop', note: 'Una emisora de música pop con sede en Taoyuan, Taiwán, China.' },
    12: { name: 'Cheng Sheng Broadcasting FM104 (Taiwán, China)', genre: 'Generalista / Música', note: 'Una emisora generalista en Taiwán, China, con música y programas de estilo de vida.' },
  },
};

const IDX = [9, 11, 12];

function writeJSON(path, data, pretty) {
  writeFileSync(path, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');
}

// 1. source.json（多行缩进）
const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
for (const i of IDX) src.china.radios[i] = zhCN[i];
writeJSON(join(DIR, 'source.json'), src, true);

// 2. zh-TW.json（单行 + opencc 简繁）
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const tw = JSON.parse(readFileSync(join(DIR, 'zh-TW.json'), 'utf8'));
for (const i of IDX) tw.china.radios[i] = { name: T(zhCN[i].name), genre: T(zhCN[i].genre), note: T(zhCN[i].note) };
writeJSON(join(DIR, 'zh-TW.json'), tw, false);

// 3. 其余 6 语言（单行）
for (const [lang, data] of Object.entries(LANGS)) {
  const file = join(DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  for (const i of IDX) d.china.radios[i] = data[i];
  writeJSON(file, d, false);
}

console.log('已同步 china.radios[9/11/12] 到 8 语言');
