// 一次性：为中亚五国 + 尼日尔/塞拉利昂补可播放音乐电台 + 多语言简介
// 1) asia.ts / africa.ts：精确替换 notableRadios（补 url），塔吉克斯坦加 radioNote 说明
// 2) i18n：按最终顺序重建 radios 数组（含 8 语言译文），tajikistan 加 radioNote
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
const TS_REPLACEMENTS_ASIA = [
  // 哈萨克斯坦
  [
    `    notableRadios: [{ name: 'Kazakh Radio / Radio Classic', genre: '综合 / 古典', note: '哈萨克国家广播及古典音乐频道，播放冬不拉与交响音乐。' }],`,
    `    notableRadios: [
      { name: 'Qazaq Radiosy', genre: '哈萨克语 / 民族', note: '哈萨克国家广播的哈萨克语主频道，播放民族音乐与冬不拉。', url: 'https://radio-streams.kaztrk.kz/qazradio/qazradio/icecast.audio', hls: false },
      { name: 'Radio Classic', genre: '古典', note: '哈萨克国家广播的古典音乐频道，播放交响与室内乐。', url: 'https://radio-streams.kaztrk.kz/classic/classic/icecast.audio', hls: false },
      { name: 'Darhan Radio', genre: '哈萨克流行', note: '哈萨克斯坦的哈萨克语流行音乐电台。', url: 'https://stream.darhanradio.com/live', hls: false },
      { name: 'Beu FM', genre: '哈萨克 / 民族流行', note: '阿拉木图的哈萨克音乐电台，播放民族与流行曲目。', url: 'https://stream.beufm.kz/beufm', hls: false },
    ],`,
  ],
  // 乌兹别克斯坦
  [
    `    notableRadios: [{ name: 'Uzbekistan Radio', genre: '综合 / 玛卡姆', note: '乌兹别克国家广播，播放沙什玛卡姆与民族音乐。' }],`,
    `    notableRadios: [
      { name: 'rytmabad', genre: '乌兹别克流行', note: '乌兹别克斯坦的当代流行音乐电台。', url: 'https://radio.filmtastic.uz/listen/rytmabad/radio.mp3', hls: false },
      { name: 'Uzbekistan Radio', genre: '综合 / 玛卡姆', note: '乌兹别克国家广播，播放沙什玛卡姆与民族音乐。' },
    ],`,
  ],
  // 吉尔吉斯斯坦
  [
    `    notableRadios: [{ name: 'Kyrgyz Radio', genre: '综合 / 史诗', note: '吉尔吉斯国家广播，播放《玛纳斯》与民族音乐。' }],`,
    `    notableRadios: [
      { name: 'Kyrgyzstan Obondoru', genre: '吉尔吉斯民歌', note: '吉尔吉斯民歌与民族音乐频道。', url: 'https://cdn.radioplayer.kg:8443/obondoru64', hls: false },
      { name: 'Suiunchu FM', genre: '吉尔吉斯 / 流行', note: '比什凯克的吉尔吉斯语音乐电台。', url: 'https://cdn.radioplayer.kg:8443/suiunchu64', hls: false },
      { name: 'Tumar FM', genre: '吉尔吉斯流行', note: '吉尔吉斯斯坦的流行音乐电台。', url: 'https://radio.tumar.fm:8005/stream', hls: false },
      { name: 'Kyrgyz Radio', genre: '综合 / 史诗', note: '吉尔吉斯国家广播，播放《玛纳斯》与民族音乐。' },
    ],`,
  ],
  // 塔吉克斯坦：保留简介项 + 加 radioNote 说明无 https 流
  [
    `    notableRadios: [{ name: 'Radio Tajikistan', genre: '综合 / 玛卡姆', note: '塔吉克国家广播，播放沙什玛卡姆与波斯音乐。' }],`,
    `    notableRadios: [{ name: 'Radio Tajikistan', genre: '综合 / 玛卡姆', note: '塔吉克国家广播，播放沙什玛卡姆与波斯音乐。' }],
    radioNote: '塔吉克斯坦的广播目前未提供稳定的 https 在线流，暂无法提供在线播放。',`,
  ],
];

const TS_REPLACEMENTS_AFRICA = [
  // 尼日尔
  [
    `    notableRadios: [{ name: 'Voix du Sahel', genre: '非洲 / 图阿雷格', note: '尼日尔国家广播。' }],`,
    `    notableRadios: [
      { name: 'Wadata Radio 107.4', genre: '非洲 / 流行', note: '尼亚美的音乐电台，播放西非流行与图阿雷格音乐。', url: 'https://stream.zeno.fm/1y2c3qbgbchvv', hls: false },
      { name: 'Voix du Sahel', genre: '非洲 / 图阿雷格', note: '尼日尔国家广播。' },
    ],`,
  ],
  // 塞拉利昂
  [
    `    notableRadios: [{ name: 'SLBC Radio', genre: '非洲 / 棕榈酒', note: '塞拉利昂国家广播。' }],`,
    `    notableRadios: [
      { name: 'Choice FM 93.3', genre: '非洲 / 流行', note: '弗里敦的音乐电台，播放西非流行与棕榈酒音乐。', url: 'https://stream.zeno.fm/ct0gvk9149puv', hls: false },
      { name: 'SLBC Radio', genre: '非洲 / 棕榈酒', note: '塞拉利昂国家广播。' },
    ],`,
  ],
];

let asia = readFileSync(ASIA_TS, 'utf8');
for (const [from, to] of TS_REPLACEMENTS_ASIA) {
  if (!asia.includes(from)) throw new Error('未找到 asia.ts 片段：\n' + from.slice(0, 80));
  asia = asia.replace(from, to);
}
writeFileSync(ASIA_TS, asia, 'utf8');
console.log('asia.ts: 已完成', TS_REPLACEMENTS_ASIA.length, '处替换');

let africa = readFileSync(AFRICA_TS, 'utf8');
for (const [from, to] of TS_REPLACEMENTS_AFRICA) {
  if (!africa.includes(from)) throw new Error('未找到 africa.ts 片段：\n' + from.slice(0, 80));
  africa = africa.replace(from, to);
}
writeFileSync(AFRICA_TS, africa, 'utf8');
console.log('africa.ts: 已完成', TS_REPLACEMENTS_AFRICA.length, '处替换');

// ---- 2) i18n ----
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const writeJSON = (p, data, pretty) =>
  writeFileSync(p, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');

const FINAL_ORDER = {
  kazakhstan: ['Qazaq Radiosy', 'Radio Classic', 'Darhan Radio', 'Beu FM'],
  uzbekistan: ['rytmabad', 'Uzbekistan Radio'],
  kyrgyzstan: ['Kyrgyzstan Obondoru', 'Suiunchu FM', 'Tumar FM', 'Kyrgyz Radio'],
  niger: ['Wadata Radio 107.4', 'Voix du Sahel'],
  'sierra-leone': ['Choice FM 93.3', 'SLBC Radio'],
};

const NEW_RADIOS = {
  'Qazaq Radiosy': { genre: '哈萨克语 / 民族', note: '哈萨克国家广播的哈萨克语主频道，播放民族音乐与冬不拉。',
    i18n: {
      en: { genre: 'Kazakh / Folk', note: "The Kazakh-language main channel of Kazakhstan's national broadcaster, playing folk music and dombra." },
      cy: { genre: 'Casacheg / Gwerin', note: 'Prif sianel Gasacheg darlledwr cenedlaethol Kazakhstan, yn chwarae cerddoriaeth werin a dombra.' },
      fr: { genre: 'Kazakh / Folk', note: 'La chaîne principale en kazakh du diffuseur national, avec musique folklorique et dombra.' },
      de: { genre: 'Kasachisch / Folk', note: 'Der kasachischsprachige Hauptkanal des nationalen Rundfunks Kasachstans, mit Volksmusik und Dombra.' },
      it: { genre: 'Kazako / Folk', note: 'Il canale principale in kazako dell\u2019emittente nazionale, con musica folk e dombra.' },
      es: { genre: 'Kazajo / Folk', note: 'El canal principal en kazajo de la emisora nacional, con música folclórica y dombra.' },
    } },
  'Radio Classic': { genre: '古典', note: '哈萨克国家广播的古典音乐频道，播放交响与室内乐。',
    i18n: {
      en: { genre: 'Classical', note: "The classical music channel of Kazakhstan's national broadcaster, playing symphonic and chamber music." },
      cy: { genre: 'Clasurol', note: 'Sianel gerddoriaeth glasurol darlledwr cenedlaethol Kazakhstan, yn chwarae cerddoriaeth symffonig a siambr.' },
      fr: { genre: 'Classique', note: 'La chaîne de musique classique du diffuseur national du Kazakhstan, avec musique symphonique et de chambre.' },
      de: { genre: 'Klassik', note: 'Der Klassikkanal des nationalen Rundfunks Kasachstans, mit Sinfonie- und Kammermusik.' },
      it: { genre: 'Classica', note: 'Il canale di musica classica dell\u2019emittente nazionale del Kazakistan, con musica sinfonica e da camera.' },
      es: { genre: 'Clásica', note: 'El canal de música clásica de la emisora nacional de Kazajistán, con música sinfónica y de cámara.' },
    } },
  'Darhan Radio': { genre: '哈萨克流行', note: '哈萨克斯坦的哈萨克语流行音乐电台。',
    i18n: {
      en: { genre: 'Kazakh pop', note: "A Kazakh-language pop music station from Kazakhstan." },
      cy: { genre: 'Pop Casacheg', note: 'Gorsaf gerddoriaeth bop Gasacheg o Kazakhstan.' },
      fr: { genre: 'Pop kazakh', note: 'Une station de musique pop kazakhe du Kazakhstan.' },
      de: { genre: 'Kasachischer Pop', note: 'Ein kasachischsprachiger Pop-Sender aus Kasachstan.' },
      it: { genre: 'Pop kazako', note: 'Una stazione di musica pop kazaka del Kazakistan.' },
      es: { genre: 'Pop kazajo', note: 'Una emisora de música pop kazaja de Kazajistán.' },
    } },
  'Beu FM': { genre: '哈萨克 / 民族流行', note: '阿拉木图的哈萨克音乐电台，播放民族与流行曲目。',
    i18n: {
      en: { genre: 'Kazakh / Ethnic pop', note: "A Kazakh music station from Almaty, playing ethnic and popular tracks." },
      cy: { genre: 'Casacheg / Pop ethnig', note: 'Gorsaf gerddoriaeth Gasacheg o Almaty, yn chwarae traciau ethnig a phoblogaidd.' },
      fr: { genre: 'Kazakh / Pop ethnique', note: 'Une station de musique kazakhe d\u2019Almaty, avec des titres ethniques et populaires.' },
      de: { genre: 'Kasachisch / Ethno-Pop', note: 'Ein kasachischer Musiksender aus Almaty mit ethnischen und populären Titeln.' },
      it: { genre: 'Kazako / Pop etnico', note: 'Una stazione di musica kazaka di Almaty, con brani etnici e popolari.' },
      es: { genre: 'Kazajo / Pop étnico', note: 'Una emisora de música kazaja de Almaty, con temas étnicos y populares.' },
    } },
  rytmabad: { genre: '乌兹别克流行', note: '乌兹别克斯坦的当代流行音乐电台。',
    i18n: {
      en: { genre: 'Uzbek pop', note: "A contemporary pop music station from Uzbekistan." },
      cy: { genre: 'Pop Wsbeceg', note: 'Gorsaf gerddoriaeth bop gyfoes o Wsbecistan.' },
      fr: { genre: 'Pop ouzbek', note: 'Une station de musique pop contemporaine d\u2019Ouzbékistan.' },
      de: { genre: 'Usbekischer Pop', note: 'Ein zeitgenössischer Pop-Sender aus Usbekistan.' },
      it: { genre: 'Pop uzbeko', note: 'Una stazione di musica pop contemporanea dell\u2019Uzbekistan.' },
      es: { genre: 'Pop uzbeko', note: 'Una emisora de música pop contemporánea de Uzbekistán.' },
    } },
  'Kyrgyzstan Obondoru': { genre: '吉尔吉斯民歌', note: '吉尔吉斯民歌与民族音乐频道。',
    i18n: {
      en: { genre: 'Kyrgyz folk', note: "A channel of Kyrgyz folk and traditional music." },
      cy: { genre: 'Gwerin Kyrgyz', note: 'Sianel o gerddoriaeth werin a thraddodiadol Kyrgyz.' },
      fr: { genre: 'Folk kirghize', note: 'Une chaîne de musique folklorique et traditionnelle kirghize.' },
      de: { genre: 'Kirgisischer Folk', note: 'Ein Kanal mit kirgisischer Volks- und traditioneller Musik.' },
      it: { genre: 'Folk kirghizo', note: 'Un canale di musica folk e tradizionale kirghisa.' },
      es: { genre: 'Folk kirguís', note: 'Un canal de música folclórica y tradicional kirguís.' },
    } },
  'Suiunchu FM': { genre: '吉尔吉斯 / 流行', note: '比什凯克的吉尔吉斯语音乐电台。',
    i18n: {
      en: { genre: 'Kyrgyz / Pop', note: "A Kyrgyz-language music station from Bishkek." },
      cy: { genre: 'Kyrgyz / Pop', note: 'Gorsaf gerddoriaeth iaith Kyrgyz o Bishkek.' },
      fr: { genre: 'Kirghize / Pop', note: 'Une station de musique en kirghize de Bichkek.' },
      de: { genre: 'Kirgisisch / Pop', note: 'Ein kirgisischsprachiger Musiksender aus Bischkek.' },
      it: { genre: 'Kirghiso / Pop', note: 'Una stazione musicale in lingua kirghisa di Bishkek.' },
      es: { genre: 'Kirguís / Pop', note: 'Una emisora musical en kirguís de Biskek.' },
    } },
  'Tumar FM': { genre: '吉尔吉斯流行', note: '吉尔吉斯斯坦的流行音乐电台。',
    i18n: {
      en: { genre: 'Kyrgyz pop', note: "A pop music station from Kyrgyzstan." },
      cy: { genre: 'Pop Kyrgyz', note: 'Gorsaf gerddoriaeth bop o Kyrgyzstan.' },
      fr: { genre: 'Pop kirghize', note: 'Une station de musique pop du Kirghizistan.' },
      de: { genre: 'Kirgisischer Pop', note: 'Ein Pop-Sender aus Kirgisistan.' },
      it: { genre: 'Pop kirghiso', note: 'Una stazione di musica pop del Kirghizistan.' },
      es: { genre: 'Pop kirguís', note: 'Una emisora de música pop de Kirguistán.' },
    } },
  'Wadata Radio 107.4': { genre: '非洲 / 流行', note: '尼亚美的音乐电台，播放西非流行与图阿雷格音乐。',
    i18n: {
      en: { genre: 'African / Pop', note: "A Niamey music station playing West African pop and Tuareg music." },
      cy: { genre: 'Affricanaidd / Pop', note: 'Gorsaf gerddoriaeth o Niamey yn chwarae pop Gorllewin Affrica a cherddoriaeth Tuareg.' },
      fr: { genre: 'Africain / Pop', note: 'Une radio musicale de Niamey diffusant de la pop ouest-africaine et de la musique touareg.' },
      de: { genre: 'Afrikanisch / Pop', note: 'Ein Musiksender aus Niamey mit westafrikanischem Pop und Tuareg-Musik.' },
      it: { genre: 'Africano / Pop', note: 'Una radio musicale di Niamey con pop dell\u2019Africa occidentale e musica tuareg.' },
      es: { genre: 'Africano / Pop', note: 'Una emisora musical de Niamey con pop de África occidental y música tuareg.' },
    } },
  'Choice FM 93.3': { genre: '非洲 / 流行', note: '弗里敦的音乐电台，播放西非流行与棕榈酒音乐。',
    i18n: {
      en: { genre: 'African / Pop', note: "A Freetown music station playing West African pop and palm-wine music." },
      cy: { genre: 'Affricanaidd / Pop', note: 'Gorsaf gerddoriaeth o Freetown yn chwarae pop Gorllewin Affrica a cherddoriaeth palm-wine.' },
      fr: { genre: 'Africain / Pop', note: 'Une radio musicale de Freetown diffusant de la pop ouest-africaine et de la musique palm-wine.' },
      de: { genre: 'Afrikanisch / Pop', note: 'Ein Musiksender aus Freetown mit westafrikanischem Pop und Palmwein-Musik.' },
      it: { genre: 'Africano / Pop', note: 'Una radio musicale di Freetown con pop dell\u2019Africa occidentale e musica palm-wine.' },
      es: { genre: 'Africano / Pop', note: 'Una emisora musical de Freetown con pop de África occidental y música palm-wine.' },
    } },
};

// 塔吉克斯坦 radioNote 8 语言
const TJ_RADIONOTE = {
  'zh-CN': '塔吉克斯坦的广播目前未提供稳定的 https 在线流，暂无法提供在线播放。',
  'zh-TW': '塔吉克斯坦的廣播目前未提供穩定的 https 在線流，暫無法提供在線播放。',
  en: "Tajikistan's broadcasters do not currently offer stable HTTPS streams, so online playback is unavailable.",
  cy: 'Nid yw darlledwyr Tajikistan ar hyn o bryd yn cynnig ffrydiau HTTPS sefydlog, felly nid oes chwarae ar-lein ar gael.',
  fr: "Les diffuseurs du Tadjikistan ne proposent pas encore de flux HTTPS stables, le streaming n'est donc pas disponible.",
  de: 'Die Sender Tadschikistans bieten derzeit keine stabilen HTTPS-Streams an, daher ist Online-Wiedergabe nicht verfügbar.',
  it: 'Le emittenti del Tagikistan non offrono attualmente flussi HTTPS stabili, quindi la riproduzione online non è disponibile.',
  es: 'Las emisoras de Tayikistán no ofrecen actualmente flujos HTTPS estables, por lo que la reproducción en línea no está disponible.',
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
  src.tajikistan.radioNote = TJ_RADIONOTE['zh-CN'];
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
  d.tajikistan.radioNote = TJ_RADIONOTE[lang];
  writeJSON(file, d, false);
  console.log(`${lang}.json: 已更新`);
}
console.log('完成。');
