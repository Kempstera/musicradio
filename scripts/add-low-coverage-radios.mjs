// 一次性：为 12 个「0 台可播放」国家补可播放音乐电台（18 个新流）+ 多语言简介
// 1) africa.ts / asia.ts：精确替换 notableRadios（补 url），保留原国家广播简介项
// 2) i18n：按最终顺序重建 radios 数组（含 8 语言译文）
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASIA_TS = join(ROOT, 'src', 'data', 'regions', 'asia.ts');
const AFRICA_TS = join(ROOT, 'src', 'data', 'regions', 'africa.ts');
const I18N_DIR = join(ROOT, 'src', 'data', 'i18n');

// ---- 1) TS 精确替换 ----
const TS_REPLACEMENTS_AFRICA = [
  // 利比里亚
  [
    `    notableRadios: [{ name: 'ELBC Radio', genre: '非洲 / 海莱弗', note: '利比里亚国家广播。' }],`,
    `    notableRadios: [
      { name: 'Alternative Youth Radio', genre: '流行 / 青年', note: '利比里亚的青年音乐电台。', url: 'https://stream.zeno.fm/crzecfbn6tzuv', hls: false },
      { name: 'ELBC Radio', genre: '非洲 / 海莱弗', note: '利比里亚国家广播。' },
    ],`,
  ],
  // 冈比亚
  [
    `    notableRadios: [{ name: 'GRTS Radio', genre: '非洲 / 科拉琴', note: '冈比亚国家广播。' }],`,
    `    notableRadios: [
      { name: 'Star FM 96.6', genre: '摇滚 / 当代', note: '班珠尔的摇滚与当代音乐电台。', url: 'https://ice.leviracloud.eu/star96-aac', hls: false },
      { name: 'GRTS Radio', genre: '非洲 / 科拉琴', note: '冈比亚国家广播。' },
    ],`,
  ],
  // 毛里塔尼亚
  [
    `    notableRadios: [{ name: 'Radio Mauritanie', genre: '阿拉伯 / 沙漠音乐', note: '毛里塔尼亚国家广播。' }],`,
    `    notableRadios: [
      { name: 'Salam FM', genre: '阿拉伯 / 音乐', note: '毛里塔尼亚的音乐电台。', url: 'https://stream.zeno.fm/ydsz0gx0gm0uv', hls: false },
      { name: 'RADIOMA', genre: '阿拉伯 / 流行', note: '毛里塔尼亚的流行音乐电台。', url: 'https://stream.zeno.fm/du2izs2nmquvv', hls: false },
      { name: 'Radio Mauritanie', genre: '阿拉伯 / 沙漠音乐', note: '毛里塔尼亚国家广播。' },
    ],`,
  ],
  // 布隆迪
  [
    `    notableRadios: [{ name: 'RTNB Radio', genre: '非洲 / 鼓乐', note: '布隆迪国家广播。' }],`,
    `    notableRadios: [
      { name: 'Heaven FM', genre: '流行 / 音乐', note: '布琼布拉的音乐电台。', url: 'https://stream.zeno.fm/eequgfw72hhvv', hls: false },
      { name: 'RTNB Radio', genre: '非洲 / 鼓乐', note: '布隆迪国家广播。' },
    ],`,
  ],
  // 吉布提
  [
    `    notableRadios: [{ name: 'RTD Radio', genre: '非洲 / 传统', note: '吉布提国家广播。' }],`,
    `    notableRadios: [
      { name: 'Nomadincub Radio', genre: '综合 / 音乐', note: '吉布提的社区音乐电台。', url: 'https://stream.zeno.fm/g4a1tx1bxnhvv', hls: false },
      { name: 'RTD Radio', genre: '非洲 / 传统', note: '吉布提国家广播。' },
    ],`,
  ],
  // 科摩罗
  [
    `    notableRadios: [{ name: 'ORTC Radio', genre: '非洲 / 传统', note: '科摩罗国家广播。' }],`,
    `    notableRadios: [
      { name: 'M Radio', genre: '科摩罗 / 流行', note: '科摩罗的音乐电台。', url: 'https://stream.zeno.fm/b0y3da8zxqzuv', hls: false },
      { name: 'TONIC FM', genre: '科摩罗 / 流行', note: '科摩罗的音乐电台。', url: 'https://stream.zeno.fm/5v6tc581mp8uv', hls: false },
      { name: 'ORTC Radio', genre: '非洲 / 传统', note: '科摩罗国家广播。' },
    ],`,
  ],
  // 加蓬
  [
    `    notableRadios: [{ name: 'Gabon 1ère', genre: '非洲 / 传统', note: '加蓬国家广播。' }],`,
    `    notableRadios: [
      { name: 'Africa No 1', genre: '非洲 / 流行', note: '始于利伯维尔的泛非法语音乐电台，非洲最具影响力的法语广播之一。', url: 'https://african1libreville.ice.infomaniak.ch/african1libreville-128.mp3', hls: false },
      { name: 'Gabon 1ère', genre: '非洲 / 传统', note: '加蓬国家广播。' },
    ],`,
  ],
  // 圣多美和普林西比
  [
    `    notableRadios: [{ name: 'RTP África', genre: '非洲 / 克里奥尔', note: '覆盖圣多美的葡语非洲电台。' }],`,
    `    notableRadios: [
      { name: 'Rádio São Tomé e Príncipe', genre: '综合 / 音乐', note: '圣多美和普林西比国家广播。', url: 'https://stream.zeno.fm/3a84k7zg4p8uv', hls: false },
      { name: 'Radio Pop Hits', genre: '流行 / 音乐', note: '圣多美的流行音乐电台。', url: 'https://stream.zeno.fm/wzkn8w4bs71vv', hls: false },
      { name: 'FSW KÚA NÓN MÚSICA', genre: '圣多美 / 音乐', note: '圣多美的本地音乐电台。', url: 'https://stream.zeno.fm/v9y0s53rquhvv', hls: false },
    ],`,
  ],
  // 博茨瓦纳
  [
    `    notableRadios: [{ name: 'RB1 / Duma FM', genre: '非洲 / 传统', note: '哈博罗内的主流电台。' }],`,
    `    notableRadios: [
      { name: 'Gabz FM 96.2', genre: '流行 / 成人当代', note: '哈博罗内的商业音乐电台，播放当代流行与怀旧金曲。', url: 'https://stream.zeno.fm/wsk9q9tfy4zuv', hls: false },
      { name: 'Duma FM', genre: '非洲 / 流行', note: '博茨瓦纳的音乐电台。', url: 'https://stream.zeno.fm/v735v8sfy4zuv', hls: false },
      { name: 'Yarona FM', genre: '流行 / 音乐', note: '博茨瓦纳的流行音乐电台。', url: 'https://stream.zeno.fm/025sdegbz4zuv', hls: false },
    ],`,
  ],
  // 莱索托
  [
    `    notableRadios: [{ name: 'Radio Lesotho', genre: '非洲 / 传统', note: '莱索托国家广播。' }],`,
    `    notableRadios: [
      { name: 'MoAfrika FM', genre: '塞索托 / 音乐', note: '马塞卢的音乐电台，播放塞索托语与本地流行。', url: 'https://stream.zeno.fm/2ab34hwatckvv', hls: false },
      { name: 'Radio Lesotho', genre: '非洲 / 传统', note: '莱索托国家广播。' },
    ],`,
  ],
  // 斯威士兰
  [
    `    notableRadios: [{ name: 'EBIS Radio', genre: '非洲 / 传统', note: '斯威士兰国家广播。' }],`,
    `    notableRadios: [
      { name: 'Blue Sky FM', genre: '氛围 / 世界音乐', note: '斯威士兰的氛围与世界音乐电台。', url: 'https://stream.zeno.fm/1w5ec6zfbxhvv', hls: false },
      { name: 'EBIS Radio', genre: '非洲 / 传统', note: '斯威士兰国家广播。' },
    ],`,
  ],
];

const TS_REPLACEMENTS_ASIA = [
  // 东帝汶
  [
    `    notableRadios: [{ name: 'RTTL（东帝汶广播电视）', genre: '综合 / 传统', note: '东帝汶国家广播电视，总部位于帝力，是了解本土德顿音乐与葡萄牙语节目的主要窗口。' }],`,
    `    notableRadios: [
      { name: 'RZO East Timor', genre: '流行 / 音乐', note: '东帝汶的音乐电台。', url: 'https://stream.zeno.fm/tsghtncm2p8uv', hls: false },
      { name: 'RTTL（东帝汶广播电视）', genre: '综合 / 传统', note: '东帝汶国家广播电视，总部位于帝力，是了解本土德顿音乐与葡萄牙语节目的主要窗口。' },
    ],`,
  ],
];

let africa = readFileSync(AFRICA_TS, 'utf8');
for (const [from, to] of TS_REPLACEMENTS_AFRICA) {
  if (!africa.includes(from)) throw new Error('未找到 africa.ts 片段：\n' + from.slice(0, 90));
  africa = africa.replace(from, to);
}
writeFileSync(AFRICA_TS, africa, 'utf8');
console.log('africa.ts: 已完成', TS_REPLACEMENTS_AFRICA.length, '处替换');

let asia = readFileSync(ASIA_TS, 'utf8');
for (const [from, to] of TS_REPLACEMENTS_ASIA) {
  if (!asia.includes(from)) throw new Error('未找到 asia.ts 片段：\n' + from.slice(0, 90));
  asia = asia.replace(from, to);
}
writeFileSync(ASIA_TS, asia, 'utf8');
console.log('asia.ts: 已完成', TS_REPLACEMENTS_ASIA.length, '处替换');

// ---- 2) i18n ----
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const writeJSON = (p, data, pretty) =>
  writeFileSync(p, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');

const FINAL_ORDER = {
  liberia: ['Alternative Youth Radio', 'ELBC Radio'],
  gambia: ['Star FM 96.6', 'GRTS Radio'],
  mauritania: ['Salam FM', 'RADIOMA', 'Radio Mauritanie'],
  burundi: ['Heaven FM', 'RTNB Radio'],
  djibouti: ['Nomadincub Radio', 'RTD Radio'],
  comoros: ['M Radio', 'TONIC FM', 'ORTC Radio'],
  gabon: ['Africa No 1', 'Gabon 1ère'],
  'sao-tome': ['Rádio São Tomé e Príncipe', 'Radio Pop Hits', 'FSW KÚA NÓN MÚSICA'],
  botswana: ['Gabz FM 96.2', 'Duma FM', 'Yarona FM'],
  lesotho: ['MoAfrika FM', 'Radio Lesotho'],
  eswatini: ['Blue Sky FM', 'EBIS Radio'],
  'timor-leste': ['RZO East Timor', 'RTTL（东帝汶广播电视）'],
};

const NEW_RADIOS = {
  'Alternative Youth Radio': { genre: '流行 / 青年', note: '利比里亚的青年音乐电台。',
    i18n: {
      en: { genre: 'Pop / Youth', note: 'A youth music station from Liberia.' },
      cy: { genre: 'Pop / Ieuenctid', note: 'Gorsaf gerddoriaeth i bobl ifanc o Liberia.' },
      fr: { genre: 'Pop / Jeunesse', note: 'Une radio musicale pour la jeunesse du Liberia.' },
      de: { genre: 'Pop / Jugend', note: 'Ein Jugend-Musiksender aus Liberia.' },
      it: { genre: 'Pop / Giovani', note: 'Una radio musicale giovanile dalla Liberia.' },
      es: { genre: 'Pop / Juvenil', note: 'Una emisora musical juvenil de Liberia.' },
    } },
  'Star FM 96.6': { genre: '摇滚 / 当代', note: '班珠尔的摇滚与当代音乐电台。',
    i18n: {
      en: { genre: 'Rock / Contemporary', note: 'A Banjul rock and contemporary music station.' },
      cy: { genre: 'Roc / Cyfoes', note: 'Gorsaf roc a cherddoriaeth gyfoes o Banjul.' },
      fr: { genre: 'Rock / Contemporain', note: 'Une radio de rock et de musique contemporaine de Banjul.' },
      de: { genre: 'Rock / Zeitgenössisch', note: 'Ein Rock- und Contemporary-Sender aus Banjul.' },
      it: { genre: 'Rock / Contemporaneo', note: 'Una radio rock e di musica contemporanea di Banjul.' },
      es: { genre: 'Rock / Contemporáneo', note: 'Una emisora de rock y música contemporánea de Banjul.' },
    } },
  'Salam FM': { genre: '阿拉伯 / 音乐', note: '毛里塔尼亚的音乐电台。',
    i18n: {
      en: { genre: 'Arabic / Music', note: 'A music station from Mauritania.' },
      cy: { genre: 'Arabaidd / Cerddoriaeth', note: 'Gorsaf gerddoriaeth o Mauritania.' },
      fr: { genre: 'Arabe / Musique', note: 'Une radio musicale de Mauritanie.' },
      de: { genre: 'Arabisch / Musik', note: 'Ein Musiksender aus Mauretanien.' },
      it: { genre: 'Arabo / Musica', note: 'Una radio musicale dalla Mauritania.' },
      es: { genre: 'Árabe / Música', note: 'Una emisora musical de Mauritania.' },
    } },
  RADIOMA: { genre: '阿拉伯 / 流行', note: '毛里塔尼亚的流行音乐电台。',
    i18n: {
      en: { genre: 'Arabic / Pop', note: 'A pop music station from Mauritania.' },
      cy: { genre: 'Arabaidd / Pop', note: 'Gorsaf gerddoriaeth bop o Mauritania.' },
      fr: { genre: 'Arabe / Pop', note: 'Une radio de musique pop de Mauritanie.' },
      de: { genre: 'Arabisch / Pop', note: 'Ein Pop-Sender aus Mauretanien.' },
      it: { genre: 'Arabo / Pop', note: 'Una radio di musica pop dalla Mauritania.' },
      es: { genre: 'Árabe / Pop', note: 'Una emisora de música pop de Mauritania.' },
    } },
  'Heaven FM': { genre: '流行 / 音乐', note: '布琼布拉的音乐电台。',
    i18n: {
      en: { genre: 'Pop / Music', note: 'A music station from Bujumbura.' },
      cy: { genre: 'Pop / Cerddoriaeth', note: 'Gorsaf gerddoriaeth o Bujumbura.' },
      fr: { genre: 'Pop / Musique', note: 'Une radio musicale de Bujumbura.' },
      de: { genre: 'Pop / Musik', note: 'Ein Musiksender aus Bujumbura.' },
      it: { genre: 'Pop / Musica', note: 'Una radio musicale di Bujumbura.' },
      es: { genre: 'Pop / Música', note: 'Una emisora musical de Buyumbura.' },
    } },
  'Nomadincub Radio': { genre: '综合 / 音乐', note: '吉布提的社区音乐电台。',
    i18n: {
      en: { genre: 'Variety / Music', note: 'A community music station from Djibouti.' },
      cy: { genre: 'Amrywiol / Cerddoriaeth', note: 'Gorsaf gerddoriaeth gymunedol o Djibouti.' },
      fr: { genre: 'Variétés / Musique', note: 'Une radio musicale communautaire de Djibouti.' },
      de: { genre: 'Vielfalt / Musik', note: 'Ein Community-Musiksender aus Dschibuti.' },
      it: { genre: 'Varietà / Musica', note: 'Una radio musicale comunitaria di Gibuti.' },
      es: { genre: 'Variado / Música', note: 'Una emisora musical comunitaria de Yibuti.' },
    } },
  'M Radio': { genre: '科摩罗 / 流行', note: '科摩罗的音乐电台。',
    i18n: {
      en: { genre: 'Comorian / Pop', note: 'A music station from the Comoros.' },
      cy: { genre: 'Comoraidd / Pop', note: 'Gorsaf gerddoriaeth o\u2019r Comoros.' },
      fr: { genre: 'Comorien / Pop', note: 'Une radio musicale des Comores.' },
      de: { genre: 'Komorisch / Pop', note: 'Ein Musiksender von den Komoren.' },
      it: { genre: 'Comoriano / Pop', note: 'Una radio musicale dalle Comore.' },
      es: { genre: 'Comorense / Pop', note: 'Una emisora musical de las Comoras.' },
    } },
  'TONIC FM': { genre: '科摩罗 / 流行', note: '科摩罗的音乐电台。',
    i18n: {
      en: { genre: 'Comorian / Pop', note: 'A music station from the Comoros.' },
      cy: { genre: 'Comoraidd / Pop', note: 'Gorsaf gerddoriaeth o\u2019r Comoros.' },
      fr: { genre: 'Comorien / Pop', note: 'Une radio musicale des Comores.' },
      de: { genre: 'Komorisch / Pop', note: 'Ein Musiksender von den Komoren.' },
      it: { genre: 'Comoriano / Pop', note: 'Una radio musicale dalle Comore.' },
      es: { genre: 'Comorense / Pop', note: 'Una emisora musical de las Comoras.' },
    } },
  'Africa No 1': { genre: '非洲 / 流行', note: '始于利伯维尔的泛非法语音乐电台，非洲最具影响力的法语广播之一。',
    i18n: {
      en: { genre: 'African / Pop', note: 'A pan-African French-language music station founded in Libreville, one of Africa\u2019s most influential French broadcasts.' },
      cy: { genre: 'Affricanaidd / Pop', note: 'Gorsaf gerddoriaeth Ffrangeg ban-Affricanaidd a sefydlwyd yn Libreville, un o ddarllediadau Ffrangeg mwyaf dylanwadol Affrica.' },
      fr: { genre: 'Africain / Pop', note: 'Radio musicale panafricaine francophone fondée à Libreville, l\u2019une des plus influentes d\u2019Afrique francophone.' },
      de: { genre: 'Afrikanisch / Pop', note: 'Ein panafrikanischer frankophoner Musiksender, gegründet in Libreville, einer der einflussreichsten französischsprachigen Sender Afrikas.' },
      it: { genre: 'Africano / Pop', note: 'Una radio musicale panafricana francofona fondata a Libreville, tra le più influenti dell\u2019Africa francofona.' },
      es: { genre: 'Africano / Pop', note: 'Una emisora musical panafricana en francés fundada en Libreville, una de las más influyentes del África francófona.' },
    } },
  'Rádio São Tomé e Príncipe': { genre: '综合 / 音乐', note: '圣多美和普林西比国家广播。',
    i18n: {
      en: { genre: 'Variety / Music', note: 'The national broadcaster of São Tomé and Príncipe.' },
      cy: { genre: 'Amrywiol / Cerddoriaeth', note: 'Darlledwr cenedlaethol São Tomé a Príncipe.' },
      fr: { genre: 'Variétés / Musique', note: 'Le diffuseur national de Sao Tomé-et-Principe.' },
      de: { genre: 'Vielfalt / Musik', note: 'Der nationale Rundfunk von São Tomé und Príncipe.' },
      it: { genre: 'Varietà / Musica', note: 'L\u2019emittente nazionale di São Tomé e Príncipe.' },
      es: { genre: 'Variado / Música', note: 'La emisora nacional de Santo Tomé y Príncipe.' },
    } },
  'Radio Pop Hits': { genre: '流行 / 音乐', note: '圣多美的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Music', note: 'A pop music station from São Tomé.' },
      cy: { genre: 'Pop / Cerddoriaeth', note: 'Gorsaf gerddoriaeth bop o São Tomé.' },
      fr: { genre: 'Pop / Musique', note: 'Une radio de musique pop de São Tomé.' },
      de: { genre: 'Pop / Musik', note: 'Ein Pop-Sender aus São Tomé.' },
      it: { genre: 'Pop / Musica', note: 'Una radio di musica pop di São Tomé.' },
      es: { genre: 'Pop / Música', note: 'Una emisora de música pop de Santo Tomé.' },
    } },
  'FSW KÚA NÓN MÚSICA': { genre: '圣多美 / 音乐', note: '圣多美的本地音乐电台。',
    i18n: {
      en: { genre: 'São Tomé / Music', note: 'A local music station from São Tomé.' },
      cy: { genre: 'São Tomé / Cerddoriaeth', note: 'Gorsaf gerddoriaeth leol o São Tomé.' },
      fr: { genre: 'Santoméen / Musique', note: 'Une radio musicale locale de São Tomé.' },
      de: { genre: 'São Tomé / Musik', note: 'Ein lokaler Musiksender aus São Tomé.' },
      it: { genre: 'São Tomé / Musica', note: 'Una radio musicale locale di São Tomé.' },
      es: { genre: 'Santomense / Música', note: 'Una emisora musical local de Santo Tomé.' },
    } },
  'Gabz FM 96.2': { genre: '流行 / 成人当代', note: '哈博罗内的商业音乐电台，播放当代流行与怀旧金曲。',
    i18n: {
      en: { genre: 'Pop / Adult contemporary', note: 'A Gaborone commercial music station playing contemporary pop and classic hits.' },
      cy: { genre: 'Pop / Cyfoes oedolyn', note: 'Gorsaf gerddoriaeth fasnachol o Gaborone yn chwarae pop cyfoes a hen ganeuon.' },
      fr: { genre: 'Pop / Adult contemporary', note: 'Une radio commerciale de Gaborone diffusant pop contemporaine et classiques.' },
      de: { genre: 'Pop / Adult Contemporary', note: 'Ein kommerzieller Musiksender aus Gaborone mit zeitgenössischem Pop und Klassikern.' },
      it: { genre: 'Pop / Adult contemporary', note: 'Una radio commerciale di Gaborone con pop contemporaneo e successi classici.' },
      es: { genre: 'Pop / Contemporáneo para adultos', note: 'Una emisora comercial de Gaborone con pop contemporáneo y clásicos.' },
    } },
  'Duma FM': { genre: '非洲 / 流行', note: '博茨瓦纳的音乐电台。',
    i18n: {
      en: { genre: 'African / Pop', note: 'A music station from Botswana.' },
      cy: { genre: 'Affricanaidd / Pop', note: 'Gorsaf gerddoriaeth o Botswana.' },
      fr: { genre: 'Africain / Pop', note: 'Une radio musicale du Botswana.' },
      de: { genre: 'Afrikanisch / Pop', note: 'Ein Musiksender aus Botswana.' },
      it: { genre: 'Africano / Pop', note: 'Una radio musicale dal Botswana.' },
      es: { genre: 'Africano / Pop', note: 'Una emisora musical de Botsuana.' },
    } },
  'Yarona FM': { genre: '流行 / 音乐', note: '博茨瓦纳的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Music', note: 'A pop music station from Botswana.' },
      cy: { genre: 'Pop / Cerddoriaeth', note: 'Gorsaf gerddoriaeth bop o Botswana.' },
      fr: { genre: 'Pop / Musique', note: 'Une radio de musique pop du Botswana.' },
      de: { genre: 'Pop / Musik', note: 'Ein Pop-Sender aus Botswana.' },
      it: { genre: 'Pop / Musica', note: 'Una radio di musica pop dal Botswana.' },
      es: { genre: 'Pop / Música', note: 'Una emisora de música pop de Botsuana.' },
    } },
  'MoAfrika FM': { genre: '塞索托 / 音乐', note: '马塞卢的音乐电台，播放塞索托语与本地流行。',
    i18n: {
      en: { genre: 'Sesotho / Music', note: 'A Maseru music station playing Sesotho and local pop.' },
      cy: { genre: 'Sesotho / Cerddoriaeth', note: 'Gorsaf gerddoriaeth o Maseru yn chwarae Sesotho a phop lleol.' },
      fr: { genre: 'Sotho / Musique', note: 'Une radio musicale de Maseru diffusant du sotho et de la pop locale.' },
      de: { genre: 'Sesotho / Musik', note: 'Ein Musiksender aus Maseru mit Sesotho und lokalem Pop.' },
      it: { genre: 'Sesotho / Musica', note: 'Una radio musicale di Maseru con sesotho e pop locale.' },
      es: { genre: 'Sesotho / Música', note: 'Una emisora musical de Maseru con sesoto y pop local.' },
    } },
  'Blue Sky FM': { genre: '氛围 / 世界音乐', note: '斯威士兰的氛围与世界音乐电台。',
    i18n: {
      en: { genre: 'Ambient / World', note: 'An ambient and world music station from Eswatini.' },
      cy: { genre: 'Amgylchynol / Byd', note: 'Gorsaf gerddoriaeth amgylchynol a byd o Eswatini.' },
      fr: { genre: 'Ambient / Musiques du monde', note: 'Une radio d\u2019ambient et de musiques du monde d\u2019Eswatini.' },
      de: { genre: 'Ambient / Weltmusik', note: 'Ein Ambient- und Weltmusik-Sender aus Eswatini.' },
      it: { genre: 'Ambient / World', note: 'Una radio di musica ambient e world dall\u2019Eswatini.' },
      es: { genre: 'Ambient / Músicas del mundo', note: 'Una emisora de música ambient y del mundo de Esuatini.' },
    } },
  'RZO East Timor': { genre: '流行 / 音乐', note: '东帝汶的音乐电台。',
    i18n: {
      en: { genre: 'Pop / Music', note: 'A music station from Timor-Leste.' },
      cy: { genre: 'Pop / Cerddoriaeth', note: 'Gorsaf gerddoriaeth o Timor-Leste.' },
      fr: { genre: 'Pop / Musique', note: 'Une radio musicale du Timor oriental.' },
      de: { genre: 'Pop / Musik', note: 'Ein Musiksender aus Osttimor.' },
      it: { genre: 'Pop / Musica', note: 'Una radio musicale da Timor Est.' },
      es: { genre: 'Pop / Música', note: 'Una emisora musical de Timor Oriental.' },
    } },
};

function entryFor(lang, name, existingByName) {
  if (NEW_RADIOS[name]) {
    const n = NEW_RADIOS[name];
    if (lang === 'zh-CN') return { name, genre: n.genre, note: n.note };
    if (lang === 'zh-TW') return { name, genre: T(n.genre), note: T(n.note) };
    const t = n.i18n[lang];
    return { name, genre: t.genre, note: t.note };
  }
  return existingByName.get(name) || { name, genre: '', note: '' };
}

function rebuildCountry(lang, slug, currentRadios) {
  const existingByName = new Map(currentRadios.map((e) => [e.name, e]));
  return FINAL_ORDER[slug].map((name) => entryFor(lang, name, existingByName));
}

// source.json（多行）
{
  const src = JSON.parse(readFileSync(join(I18N_DIR, 'source.json'), 'utf8'));
  for (const slug of Object.keys(FINAL_ORDER)) {
    src[slug].radios = rebuildCountry('zh-CN', slug, src[slug].radios);
  }
  writeJSON(join(I18N_DIR, 'source.json'), src, true);
  console.log('source.json: 已更新');
}

// 7 语言（单行）
for (const lang of ['en', 'cy', 'fr', 'de', 'it', 'es', 'zh-TW']) {
  const file = join(I18N_DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  for (const slug of Object.keys(FINAL_ORDER)) {
    d[slug].radios = rebuildCountry(lang, slug, d[slug].radios);
  }
  writeJSON(file, d, false);
  console.log(`${lang}.json: 已更新`);
}
console.log('完成。');
