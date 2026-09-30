// 一次性：为南亚补可播放电台链接 + 印度增补音乐电台 + 多语言简介
// 1) asia.ts：精确替换（补 url、插新台、radioNote 改 notableRadios）
// 2) i18n：按最终顺序重建 radios 数组（保留既有译文，新增台带 8 语言译文），maldives/afghanistan 清空 radioNote
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASIA_TS = join(ROOT, 'src', 'data', 'regions', 'asia.ts');
const I18N_DIR = join(ROOT, 'src', 'data', 'i18n');

// ---- 1) asia.ts 精确替换 ----
const TS_REPLACEMENTS = [
  // 印度：Raagam 补 url + 新增 Vividh Bharati
  [
    `    notableRadios: [
      { name: 'All India Radio - Raagam', genre: '卡纳提克古典', note: '全印广播的南印度古典音乐频道。' },
      { name: 'Radio City / AIR FM', genre: '综合 / 宝莱坞', note: '印度主流 FM 电台，播放宝莱坞与流行音乐。', url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio00564kbps.m3u8', hls: true},
    ],`,
    `    notableRadios: [
      { name: 'All India Radio - Raagam', genre: '卡纳提克古典', note: '全印广播的南印度古典音乐频道。', url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudioragam/hlspbaudioragam_Auto.m3u8', hls: true },
      { name: 'AIR Vividh Bharati', genre: '宝莱坞 / 电影音乐', note: '全印广播（AIR）著名的电影音乐频道，播放宝莱坞金曲。', url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8', hls: true },
      { name: 'Radio City / AIR FM', genre: '综合 / 宝莱坞', note: '印度主流 FM 电台，播放宝莱坞与流行音乐。', url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio00564kbps.m3u8', hls: true},
    ],`,
  ],
  // 巴基斯坦：Radio Pakistan 补 url + 新增 FM 101
  [
    `    notableRadios: [{ name: 'Radio Pakistan', genre: '综合 / 加扎尔', note: '巴基斯坦国家广播，播放加扎尔与古典音乐。' }],`,
    `    notableRadios: [
      { name: 'Radio Pakistan', genre: '综合 / 加扎尔', note: '巴基斯坦国家广播，播放加扎尔与古典音乐。', url: 'https://whmsonic.radio.gov.pk:7003/stream', hls: false },
      { name: 'FM 101', genre: '娱乐 / 流行', note: '巴基斯坦广播公司旗下的娱乐频道，播放流行与娱乐节目。', url: 'https://whmsonic.radio.gov.pk:7008/stream', hls: false },
    ],`,
  ],
  // 斯里兰卡：新增 Hiru FM + Sun FM（SLBC 保留为简介项）
  [
    `    notableRadios: [{ name: 'Sri Lanka Broadcasting Corporation', genre: '综合 / 拜拉', note: '斯里兰卡国家广播，播放拜拉与僧伽罗音乐。' }],`,
    `    notableRadios: [
      { name: 'Hiru FM', genre: '流行 / 僧伽罗', note: '斯里兰卡最受欢迎的僧伽罗语音乐电台之一。', url: 'https://radio.lotustechnologieslk.net:2020/stream/hirufmgarden/stream/1/', hls: false },
      { name: 'Sun FM', genre: '流行', note: '斯里兰卡的当代流行音乐电台。', url: 'https://radio.lotustechnologieslk.net:2020/stream/sunfmgarden', hls: false },
      { name: 'Sri Lanka Broadcasting Corporation', genre: '综合 / 拜拉', note: '斯里兰卡国家广播，播放拜拉与僧伽罗音乐。' },
    ],`,
  ],
  // 尼泊尔：Radio Nepal 补 url + 新增 Kantipur FM
  [
    `    notableRadios: [{ name: 'Radio Nepal', genre: '综合 / 洛卡', note: '尼泊尔国家广播，播放民间音乐与流行歌曲。' }],`,
    `    notableRadios: [
      { name: 'Radio Nepal', genre: '综合 / 洛卡', note: '尼泊尔国家广播，播放民间音乐与流行歌曲。', url: 'https://stream1.radionepal.gov.np/live', hls: false },
      { name: 'Kantipur FM', genre: '流行 / 综合', note: '尼泊尔主要的商业电台，播放流行音乐。', url: 'https://radio-broadcast.ekantipur.com/stream', hls: false },
    ],`,
  ],
  // 孟加拉：新增 Radio Foorti（Betar 保留为简介项）
  [
    `    notableRadios: [{ name: 'Bangladesh Betar', genre: '综合 / 罗宾德拉', note: '孟加拉国家广播，播放罗宾德拉音乐与民间音乐。' }],`,
    `    notableRadios: [
      { name: 'Radio Foorti', genre: '流行', note: '孟加拉国最大的商业音乐电台网络。', url: 'https://radiofoorti.fm/api/stream', hls: false },
      { name: 'Bangladesh Betar', genre: '综合 / 罗宾德拉', note: '孟加拉国家广播，播放罗宾德拉音乐与民间音乐。' },
    ],`,
  ],
  // 马尔代夫：radioNote → notableRadios（Dhivehi Raajjeyge Adu + Dhivehi FM）
  [
    `    radioNote: '马尔代夫岛国的广播以旅游与综合节目为主，目前无稳定可访问的在线音乐流。',`,
    `    notableRadios: [
      { name: 'Dhivehi Raajjeyge Adu', genre: '综合 / 迪维希', note: '马尔代夫之声，国家广播的主频道。', url: 'https://radio.psm.mv/draair', hls: false },
      { name: 'Dhivehi FM', genre: '流行 / 迪维希', note: '马尔代夫国家媒体旗下的娱乐音乐频道。', url: 'https://radio.psm.mv/fmair', hls: false },
    ],`,
  ],
  // 阿富汗：radioNote → notableRadios（Ariana FM + Begum FM）
  [
    `    radioNote: '受局势影响，阿富汗目前无稳定可访问的在线音乐流，暂无法提供在线播放。',`,
    `    notableRadios: [
      { name: 'Ariana FM', genre: '流行 / 综合', note: '喀布尔的主流商业电台，播放阿富汗流行与传统音乐。', url: 'https://streams.radio.co/sa3345aaa8/listen', hls: false },
      { name: 'Begum FM', genre: '综合 / 女性', note: '喀布尔以女性议题与音乐为主的电台。', url: 'https://s5.radio.co/se6264cb34/listen', hls: false },
    ],`,
  ],
];

let ts = readFileSync(ASIA_TS, 'utf8');
for (const [from, to] of TS_REPLACEMENTS) {
  if (!ts.includes(from)) {
    throw new Error('未找到 TS 片段，中止：\n' + from.slice(0, 80));
  }
  ts = ts.replace(from, to);
}
writeFileSync(ASIA_TS, ts, 'utf8');
console.log('asia.ts: 已完成', TS_REPLACEMENTS.length, '处替换');

// ---- 2) i18n ----
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const writeJSON = (p, data, pretty) =>
  writeFileSync(p, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');

// 每国最终顺序（既有台名 + 新增台名）
const FINAL_ORDER = {
  india: ['All India Radio - Raagam', 'Radio City / AIR FM', 'AIR Vividh Bharati'],
  pakistan: ['Radio Pakistan', 'FM 101'],
  'sri-lanka': ['Hiru FM', 'Sun FM', 'Sri Lanka Broadcasting Corporation'],
  nepal: ['Radio Nepal', 'Kantipur FM'],
  bangladesh: ['Radio Foorti', 'Bangladesh Betar'],
  maldives: ['Dhivehi Raajjeyge Adu', 'Dhivehi FM'],
  afghanistan: ['Ariana FM', 'Begum FM'],
};

// 新增电台（name -> { genre, note, i18n }）
const NEW_RADIOS = {
  'AIR Vividh Bharati': {
    genre: '宝莱坞 / 电影音乐', note: '全印广播（AIR）著名的电影音乐频道，播放宝莱坞金曲。',
    i18n: {
      en: { genre: 'Bollywood / Film music', note: "All India Radio's celebrated film-music channel, playing Bollywood hits." },
      cy: { genre: 'Bollywood / Cerddoriaeth-ffilm', note: "Sianel gerddoriaeth-ffilm enwog All India Radio, yn chwarae hitiau Bollywood." },
      fr: { genre: 'Bollywood / Musique de film', note: "La célèbre chaîne de musique de film d'All India Radio, avec les tubes de Bollywood." },
      de: { genre: 'Bollywood / Filmmusik', note: 'Der berühmte Filmmusik-Kanal von All India Radio mit Bollywood-Hits.' },
      it: { genre: 'Bollywood / Musica da film', note: 'Il celebre canale di musica da film di All India Radio, con i successi di Bollywood.' },
      es: { genre: 'Bollywood / Música de cine', note: 'El célebre canal de música de cine de All India Radio, con éxitos de Bollywood.' },
    },
  },
  'FM 101': {
    genre: '娱乐 / 流行', note: '巴基斯坦广播公司旗下的娱乐频道，播放流行与娱乐节目。',
    i18n: {
      en: { genre: 'Entertainment / Pop', note: 'The entertainment channel of the Pakistan Broadcasting Corporation, playing pop and entertainment.' },
      cy: { genre: 'Adloniant / Pop', note: 'Sianel adloniant Corfforaeth Ddarlledu Pakistan, yn chwarae pop ac adloniant.' },
      fr: { genre: 'Divertissement / Pop', note: 'La chaîne de divertissement de la Pakistan Broadcasting Corporation, diffusant pop et divertissement.' },
      de: { genre: 'Unterhaltung / Pop', note: 'Der Unterhaltungskanal der Pakistan Broadcasting Corporation mit Pop und Unterhaltung.' },
      it: { genre: 'Intrattenimento / Pop', note: 'Il canale di intrattenimento della Pakistan Broadcasting Corporation, con pop e intrattenimento.' },
      es: { genre: 'Entretenimiento / Pop', note: 'El canal de entretenimiento de la Pakistan Broadcasting Corporation, con pop y entretenimiento.' },
    },
  },
  'Hiru FM': {
    genre: '流行 / 僧伽罗', note: '斯里兰卡最受欢迎的僧伽罗语音乐电台之一。',
    i18n: {
      en: { genre: 'Pop / Sinhala', note: "One of Sri Lanka's most popular Sinhala-language music stations." },
      cy: { genre: 'Pop / Sinhaleg', note: 'Un o orsafoedd cerddoriaeth Sinhaleg mwyaf poblogaidd Sri Lanka.' },
      fr: { genre: 'Pop / Cinghalais', note: "L'une des stations de musique cinghalaise les plus populaires du Sri Lanka." },
      de: { genre: 'Pop / Singhalesisch', note: 'Einer der beliebtesten singhalesischsprachigen Musiksender Sri Lankas.' },
      it: { genre: 'Pop / Singalese', note: 'Una delle stazioni musicali in lingua singalese più popolari dello Sri Lanka.' },
      es: { genre: 'Pop / Cingalés', note: 'Una de las emisoras de música en cingalés más populares de Sri Lanka.' },
    },
  },
  'Sun FM': {
    genre: '流行', note: '斯里兰卡的当代流行音乐电台。',
    i18n: {
      en: { genre: 'Pop', note: 'A contemporary pop music station in Sri Lanka.' },
      cy: { genre: 'Pop', note: 'Gorsaf gerddoriaeth bop gyfoes yn Sri Lanka.' },
      fr: { genre: 'Pop', note: 'Une station de musique pop contemporaine au Sri Lanka.' },
      de: { genre: 'Pop', note: 'Ein zeitgenössischer Popmusik-Sender in Sri Lanka.' },
      it: { genre: 'Pop', note: 'Una stazione di musica pop contemporanea nello Sri Lanka.' },
      es: { genre: 'Pop', note: 'Una emisora de música pop contemporánea en Sri Lanka.' },
    },
  },
  'Kantipur FM': {
    genre: '流行 / 综合', note: '尼泊尔主要的商业电台，播放流行音乐。',
    i18n: {
      en: { genre: 'Pop / General', note: 'A major commercial radio station in Nepal playing popular music.' },
      cy: { genre: 'Pop / Cyffredinol', note: 'Gorsaf fasnachol fawr yn Nepal yn chwarae cerddoriaeth boblogaidd.' },
      fr: { genre: 'Pop / Général', note: 'Une grande radio commerciale du Népal diffusant de la musique populaire.' },
      de: { genre: 'Pop / Allgemein', note: 'Ein großer kommerzieller Radiosender in Nepal mit populärer Musik.' },
      it: { genre: 'Pop / Generalista', note: 'Una grande radio commerciale del Nepal che trasmette musica popolare.' },
      es: { genre: 'Pop / General', note: 'Una gran emisora comercial de Nepal que emite música popular.' },
    },
  },
  'Radio Foorti': {
    genre: '流行', note: '孟加拉国最大的商业音乐电台网络。',
    i18n: {
      en: { genre: 'Pop', note: "Bangladesh's largest commercial music radio network." },
      cy: { genre: 'Pop', note: 'Rhwydwaith radio cerddoriaeth fasnachol fwyaf Bangladesh.' },
      fr: { genre: 'Pop', note: 'Le plus grand réseau de radio musicale commerciale du Bangladesh.' },
      de: { genre: 'Pop', note: 'Das größte kommerzielle Musikradio-Netzwerk Bangladeschs.' },
      it: { genre: 'Pop', note: 'La più grande rete radiofonica musicale commerciale del Bangladesh.' },
      es: { genre: 'Pop', note: 'La mayor red de radio musical comercial de Bangladés.' },
    },
  },
  'Dhivehi Raajjeyge Adu': {
    genre: '综合 / 迪维希', note: '马尔代夫之声，国家广播的主频道。',
    i18n: {
      en: { genre: 'General / Dhivehi', note: "The Voice of the Maldives, the national broadcaster's main channel." },
      cy: { genre: 'Cyffredinol / Divehi', note: 'Llais y Maldives, prif sianel y darlledwr cenedlaethol.' },
      fr: { genre: 'Général / Divehi', note: 'La Voix des Maldives, la chaîne principale du diffuseur national.' },
      de: { genre: 'Allgemein / Dhivehi', note: 'Die Stimme der Malediven, der Hauptkanal des nationalen Rundfunks.' },
      it: { genre: 'Generalista / Divehi', note: "La Voce delle Maldive, il canale principale dell'emittente nazionale." },
      es: { genre: 'General / Dhivehi', note: 'La Voz de las Maldivas, el canal principal del servicio público nacional.' },
    },
  },
  'Dhivehi FM': {
    genre: '流行 / 迪维希', note: '马尔代夫国家媒体旗下的娱乐音乐频道。',
    i18n: {
      en: { genre: 'Pop / Dhivehi', note: "The entertainment and music channel of the Maldives' public media." },
      cy: { genre: 'Pop / Divehi', note: 'Sianel adloniant a cherddoriaeth cyfryngau cyhoeddus y Maldives.' },
      fr: { genre: 'Pop / Divehi', note: 'La chaîne de divertissement et de musique des médias publics des Maldives.' },
      de: { genre: 'Pop / Dhivehi', note: 'Der Unterhaltungs- und Musiksender der öffentlichen Medien der Malediven.' },
      it: { genre: 'Pop / Divehi', note: 'Il canale di intrattenimento e musica dei media pubblici delle Maldive.' },
      es: { genre: 'Pop / Dhivehi', note: 'El canal de entretenimiento y música de los medios públicos de las Maldivas.' },
    },
  },
  'Ariana FM': {
    genre: '流行 / 综合', note: '喀布尔的主流商业电台，播放阿富汗流行与传统音乐。',
    i18n: {
      en: { genre: 'Pop / General', note: 'A leading commercial station in Kabul playing Afghan pop and traditional music.' },
      cy: { genre: 'Pop / Cyffredinol', note: 'Gorsaf fasnachol flaenllaw yn Kabul yn chwarae cerddoriaeth boblogaidd a thraddodiadol Affganaidd.' },
      fr: { genre: 'Pop / Général', note: 'Une grande radio commerciale de Kaboul diffusant de la musique pop et traditionnelle afghane.' },
      de: { genre: 'Pop / Allgemein', note: 'Ein führender kommerzieller Sender in Kabul mit afghanischem Pop und traditioneller Musik.' },
      it: { genre: 'Pop / Generalista', note: 'Una delle principali radio commerciali di Kabul, con pop e musica tradizionale afghana.' },
      es: { genre: 'Pop / General', note: 'Una emisora comercial líder en Kabul con pop y música tradicional afgana.' },
    },
  },
  'Begum FM': {
    genre: '综合 / 女性', note: '喀布尔以女性议题与音乐为主的电台。',
    i18n: {
      en: { genre: 'General / Women', note: "A Kabul station focused on women's issues and music." },
      cy: { genre: 'Cyffredinol / Merched', note: 'Gorsaf Kabul sy\u2019n canolbwyntio ar faterion merched a cherddoriaeth.' },
      fr: { genre: 'Général / Femmes', note: 'Une radio de Kaboul axée sur les questions féminines et la musique.' },
      de: { genre: 'Allgemein / Frauen', note: 'Ein Sender in Kabul mit Schwerpunkt auf Frauenthemen und Musik.' },
      it: { genre: 'Generalista / Donne', note: 'Una radio di Kabul incentrata su temi femminili e musica.' },
      es: { genre: 'General / Mujeres', note: 'Una emisora de Kabul centrada en temas de la mujer y la música.' },
    },
  },
};

// 需要清空 radioNote 的国家（已具备可播放流）
const CLEAR_RADIONOTE = ['maldives', 'afghanistan'];

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
  const order = FINAL_ORDER[slug];
  return order.map((name) => entryFor(lang, name, existingByName));
}

// source.json（多行）
{
  const src = JSON.parse(readFileSync(join(I18N_DIR, 'source.json'), 'utf8'));
  for (const slug of Object.keys(FINAL_ORDER)) {
    src[slug].radios = rebuildCountry('zh-CN', slug, src[slug].radios);
    if (CLEAR_RADIONOTE.includes(slug)) src[slug].radioNote = '';
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
    if (CLEAR_RADIONOTE.includes(slug)) d[slug].radioNote = '';
  }
  writeJSON(file, d, false);
  console.log(`${lang}.json: 已更新`);
}
console.log('完成。');
