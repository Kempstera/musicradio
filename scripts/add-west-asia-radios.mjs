// 一次性：为西亚补可播放音乐电台 + 多语言简介
// 1) asia.ts：精确替换 13 国 notableRadios（补 url、插新台、yemen radioNote 改 notableRadios）
// 2) i18n：按最终顺序重建 radios 数组（保留既有译文，新增台带 8 语言译文），yemen 清空 radioNote
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
  // 沙特：MBC Mood + MBC Loud（MBC FM 保留为简介项）
  [
    `    notableRadios: [{ name: 'Saudi Radio / MBC FM', genre: '综合 / 阿拉伯', note: '沙特广播与 MBC 集团的音乐频道，播放阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'MBC Mood', genre: '舒缓 / 阿拉伯', note: 'MBC 集团的舒缓音乐频道，播放柔和的阿拉伯与当代曲目。', url: 'https://radio-mbc-mood.mbc.net/radio-mbc-mood.m3u8', hls: true },
      { name: 'MBC Loud', genre: 'Top 40 / 流行', note: 'MBC 集团的流行音乐频道，播放阿拉伯与国际 Top 40 金曲。', url: 'https://radio-loud-fm.mbc.net/radio-loud-fm.m3u8', hls: true },
      { name: 'MBC FM', genre: '阿拉伯流行', note: 'MBC 集团的旗舰阿拉伯语音乐电台。' },
    ],`,
  ],
  // 也门：radioNote → notableRadios
  [
    `    radioNote: '受多年战乱影响，也门的广播基础设施受损严重，目前无稳定可访问的在线音乐流。',`,
    `    notableRadios: [
      { name: 'Huna Aden FM', genre: '综合 / 阿拉伯', note: '亚丁的电台，播放阿拉伯与也门音乐。', url: 'https://c30.radioboss.fm:18267/stream', hls: false },
      { name: "Sana'a Radio", genre: '综合 / 民歌', note: '萨那的广播电台，播放也门民歌与传统音乐。', url: 'https://dc5.serverse.com/proxy/pbmhbvxs/stream', hls: false },
    ],`,
  ],
  // 阿曼：Hala FM（保留国家台简介项）
  [
    `    notableRadios: [{ name: 'Oman FM / Sultanate of Oman Radio', genre: '综合 / 传统', note: '阿曼国家广播，播放传统音乐与文化节目。' }],`,
    `    notableRadios: [
      { name: 'Hala FM', genre: '阿拉伯流行', note: '马斯喀特最受欢迎的阿拉伯语音乐电台。', url: 'https://listen-halafm.sharp-stream.com/halafmlow.mp3', hls: false },
      { name: 'Oman FM / Sultanate of Oman Radio', genre: '综合 / 传统', note: '阿曼国家广播，播放传统音乐与文化节目。' },
    ],`,
  ],
  // 阿联酋
  [
    `    notableRadios: [{ name: 'Abu Dhabi Classic FM', genre: '古典', note: '阿布扎比的古典音乐电台，是海湾地区少数专注古典的频道。' }],`,
    `    notableRadios: [
      { name: 'Abu Dhabi FM', genre: '阿拉伯流行', note: '阿布扎比的阿拉伯语音乐电台。', url: 'https://admn-radio-cdn-lb.starzplayarabia.com/out/v1/admn_radio_enc/abudhabi_fm/abudhabi_fm_hls_nd/index.m3u8', hls: true },
      { name: 'Emarat FM', genre: '阿拉伯 / 综合', note: '阿联酋的阿拉伯语综合音乐电台。', url: 'https://admn-radio-cdn-lb.starzplayarabia.com/out/v1/admn_radio_enc/emarat_fm/emarat_fm_hls_nd/index.m3u8', hls: true },
      { name: 'Radio Mirchi Dubai', genre: '宝莱坞 / 印度流行', note: '迪拜的印度音乐电台。', url: 'https://eu8.fastcast4u.com/proxy/clyedupq/?mp=/1', hls: false },
      { name: 'Big FM 106.2 UAE', genre: '印度 / 亚洲流行', note: '阿联酋的亚洲流行音乐电台。', url: 'https://funasia.streamguys1.com/live4', hls: false },
      { name: 'Abu Dhabi Classic FM', genre: '古典', note: '阿布扎比的古典音乐电台，是海湾地区少数专注古典的频道。' },
    ],`,
  ],
  // 卡塔尔
  [
    `    notableRadios: [{ name: 'Qatar Radio / QBS', genre: '综合 / 传统', note: '卡塔尔广播，播放阿拉伯与传统音乐。' }],`,
    `    notableRadios: [
      { name: 'Radio Olive 106.3', genre: '印度 / 亚洲流行', note: '卡塔尔的印度语音乐电台。', url: 'https://osrnstream.olivesuno.com/olive1063.mp3', hls: false },
      { name: 'Qabayan Radio 94.3', genre: '菲律宾 / 综合', note: '卡塔尔的菲律宾社区电台。', url: 'https://c2.radioboss.fm:8478/live', hls: false },
      { name: 'Qatar Radio / QBS', genre: '综合 / 传统', note: '卡塔尔广播，播放阿拉伯与传统音乐。' },
    ],`,
  ],
  // 科威特
  [
    `    notableRadios: [{ name: 'Kuwait Radio', genre: '综合 / 萨乌特', note: '科威特国家广播，播放海湾与阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'Kuwait General Radio', genre: '综合 / 萨乌特', note: '科威特国家广播，播放海湾与阿拉伯音乐。', url: 'https://kwtkrdota.cdn.mangomolo.com/k1rdo/k1rdo.stream_aac/chunklist.m3u8', hls: true },
    ],`,
  ],
  // 巴林
  [
    `    notableRadios: [{ name: 'Bahrain Radio', genre: '综合 / 传统', note: '巴林国家广播，播放海湾传统音乐。' }],`,
    `    notableRadios: [
      { name: 'Bahrain FM 93.3', genre: '阿拉伯 / 海湾', note: '巴林国家广播的音乐频道。', url: 'https://5c7b683162943.streamlock.net/live/ngrp:radio-93-3_all/playlist.m3u8', hls: true },
      { name: 'Traditional Radio 95.0', genre: '传统 / 海湾', note: '巴林的传统音乐频道。', url: 'https://5c7b683162943.streamlock.net/live/ngrp:radio-95-0_all/chunklist_w1641860732_b981072.m3u8', hls: true },
    ],`,
  ],
  // 伊拉克
  [
    `    notableRadios: [{ name: 'Iraqi Media Network', genre: '综合 / 马卡姆', note: '伊拉克国家媒体网络，播放伊拉克马卡姆与阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'Sumer FM', genre: '阿拉伯流行', note: '伊拉克的阿拉伯语流行音乐电台。', url: 'https://l3.itworkscdn.net/itwaudio/9012/stream', hls: false },
      { name: 'Al Rasheed FM', genre: '综合 / 伊拉克', note: '巴格达的广播电台，播放伊拉克与阿拉伯音乐。', url: 'https://streaming.shoutcast.com/alrasheed-fm', hls: false },
      { name: 'Iraqi Media Network', genre: '综合 / 马卡姆', note: '伊拉克国家媒体网络，播放伊拉克马卡姆与阿拉伯音乐。' },
    ],`,
  ],
  // 叙利亚
  [
    `    notableRadios: [{ name: 'Syrian Radio', genre: '综合 / 穆瓦沙赫', note: '叙利亚广播，播放穆瓦沙赫与传统阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'Sham FM', genre: '阿拉伯流行', note: '大马士革最受欢迎的阿拉伯语电台。', url: 'https://radioshamfm.grtvstream.com:8400/;', hls: false },
      { name: 'Farah FM', genre: '阿拉伯流行', note: '叙利亚的阿拉伯流行音乐电台。', url: 'https://radio.farah.fm/', hls: false },
      { name: 'Al Karma FM', genre: '阿拉伯 / 综合', note: '叙利亚的阿拉伯音乐电台。', url: 'https://broadcast.shoutstream.co.uk/stream/8112', hls: false },
      { name: 'Syrian Radio', genre: '综合 / 穆瓦沙赫', note: '叙利亚广播，播放穆瓦沙赫与传统阿拉伯音乐。' },
    ],`,
  ],
  // 黎巴嫩
  [
    `    notableRadios: [{ name: 'Radio Liban / Voice of Lebanon', genre: '综合 / 阿拉伯', note: '黎巴嫩广播与黎巴嫩之声，播放阿拉伯音乐与文化节目。', url: 'https://media2.streambrothers.com:2020/stream/8194', hls: false}],`,
    `    notableRadios: [
      { name: 'Virgin Radio Lebanon', genre: '流行', note: '黎巴嫩的 Virgin 电台，播放国际与阿拉伯流行。', url: 'https://stream.zeno.fm/dwxw3p9vea0uv', hls: false },
      { name: 'One FM', genre: '流行 / 舞曲', note: '黎巴嫩著名的流行音乐电台。', url: 'https://hms.pfs.gdn/v1/broadcast/onefmaudio/playlist.m3u8', hls: true },
      { name: 'Aghani Aghani 87.9 FM', genre: '阿拉伯流行', note: '黎巴嫩的阿拉伯流行音乐电台。', url: 'https://streaming.nrjaudio.fm/ou6pfgxp336f', hls: false },
      { name: 'LBI Radio', genre: '国际 / 中东', note: '黎巴嫩国际广播电台。', url: 'https://live.lbiradio.com/listen/station_1/1', hls: false },
      { name: 'Fairuz', genre: '费鲁兹 / 阿拉伯经典', note: '全天播放费鲁兹与阿拉伯经典歌曲的专题电台。', url: 'https://stream.zeno.fm/xkhnk4vee18uv', hls: false },
      { name: 'Radio Liban / Voice of Lebanon', genre: '综合 / 阿拉伯', note: '黎巴嫩广播与黎巴嫩之声，播放阿拉伯音乐与文化节目。', url: 'https://media2.streambrothers.com:2020/stream/8194', hls: false },
    ],`,
  ],
  // 约旦
  [
    `    notableRadios: [{ name: 'Jordan Radio', genre: '综合 / 贝都因', note: '约旦广播电视，播放贝都因与阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'Mazaj FM', genre: '阿拉伯流行', note: '约旦最受欢迎的音乐电台。', url: 'https://mazajfm.ice.infomaniak.ch/mazajfm-192.mp3', hls: false },
      { name: 'Radio Dahab', genre: '阿拉伯 / 经典', note: '约旦的阿拉伯音乐电台。', url: 'https://dahab.ice.infomaniak.ch/dahab-192.mp3', hls: false },
      { name: 'Mood FM', genre: '流行', note: '安曼的流行音乐电台。', url: 'https://securestreams2.autopo.st:1241/live', hls: false },
      { name: 'Beat FM', genre: '流行 / 舞曲', note: '安曼的流行音乐电台。', url: 'https://securestreams2.autopo.st:1242/live', hls: false },
      { name: 'Jordan Radio', genre: '综合 / 贝都因', note: '约旦广播电视，播放贝都因与阿拉伯音乐。' },
    ],`,
  ],
  // 以色列
  [
    `    notableRadios: [{ name: 'Kol HaMusica', genre: '古典', note: '以色列广播的古典音乐频道。' }],`,
    `    notableRadios: [
      { name: 'Galgalatz', genre: '流行 / 当代', note: '以色列最受欢迎的流行音乐电台。', url: 'https://glzicylv01.bynetcdn.com/glglz_mp3', hls: false },
      { name: '88FM', genre: '成人当代 / 爵士', note: '以色列公共广播 KAN 的音乐频道。', url: 'https://29073.live.streamtheworld.com/KAN_88.mp3', hls: false },
      { name: 'KAN Gimel', genre: '希伯来音乐', note: '以色列公共广播的希伯来语音乐频道。', url: 'https://27873.live.streamtheworld.com/KAN_GIMMEL.mp3', hls: false },
      { name: 'ECO99FM', genre: '流行 / Top 40', note: '以色列的流行音乐电台。', url: 'https://eco-live.mediacast.co.il/99fm_aac', hls: false },
      { name: 'Radio 103FM', genre: '音乐 / 综合', note: '特拉维夫的综合性音乐电台。', url: 'https://cdn.cybercdn.live/103FM/Live/icecast.audio', hls: false },
      { name: 'Ze Rock Radio', genre: '摇滚', note: '以色列的摇滚音乐电台。', url: 'https://icecast.live/proxy/zerock/zerock', hls: false },
      { name: 'Kol HaMusica', genre: '古典', note: '以色列广播的古典音乐频道。', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_KOL_HAMUSICA.mp3', hls: false },
    ],`,
  ],
  // 巴勒斯坦
  [
    `    notableRadios: [{ name: 'Voice of Palestine', genre: '综合 / 民歌', note: '巴勒斯坦之声广播，播放巴勒斯坦民歌与阿拉伯音乐。' }],`,
    `    notableRadios: [
      { name: 'Ajyal', genre: '阿拉伯流行', note: '巴勒斯坦的阿拉伯流行音乐电台。', url: 'https://streamer.mada.ps:8208/ajyal', hls: false },
      { name: 'Raya FM', genre: '阿拉伯 / 综合', note: '巴勒斯坦的阿拉伯语综合电台。', url: 'https://rstream.hadara.ps/proxy/raya/stream', hls: false },
      { name: 'Voice of Palestine', genre: '综合 / 民歌', note: '巴勒斯坦之声广播，播放巴勒斯坦民歌与阿拉伯音乐。' },
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

// 每国最终顺序（与 TS notableRadios 顺序一致）
const FINAL_ORDER = {
  'saudi-arabia': ['MBC Mood', 'MBC Loud', 'MBC FM'],
  yemen: ['Huna Aden FM', "Sana'a Radio"],
  oman: ['Hala FM', 'Oman FM / Sultanate of Oman Radio'],
  'united-arab-emirates': ['Abu Dhabi FM', 'Emarat FM', 'Radio Mirchi Dubai', 'Big FM 106.2 UAE', 'Abu Dhabi Classic FM'],
  qatar: ['Radio Olive 106.3', 'Qabayan Radio 94.3', 'Qatar Radio / QBS'],
  kuwait: ['Kuwait General Radio'],
  bahrain: ['Bahrain FM 93.3', 'Traditional Radio 95.0'],
  iraq: ['Sumer FM', 'Al Rasheed FM', 'Iraqi Media Network'],
  syria: ['Sham FM', 'Farah FM', 'Al Karma FM', 'Syrian Radio'],
  lebanon: ['Virgin Radio Lebanon', 'One FM', 'Aghani Aghani 87.9 FM', 'LBI Radio', 'Fairuz', 'Radio Liban / Voice of Lebanon'],
  jordan: ['Mazaj FM', 'Radio Dahab', 'Mood FM', 'Beat FM', 'Jordan Radio'],
  israel: ['Galgalatz', '88FM', 'KAN Gimel', 'ECO99FM', 'Radio 103FM', 'Ze Rock Radio', 'Kol HaMusica'],
  palestine: ['Ajyal', 'Raya FM', 'Voice of Palestine'],
};

// 新增电台（name -> { genre, note, i18n }）
const NEW_RADIOS = {
  'MBC Mood': { genre: '舒缓 / 阿拉伯', note: 'MBC 集团的舒缓音乐频道，播放柔和的阿拉伯与当代曲目。',
    i18n: {
      en: { genre: 'Easy / Arabic', note: "MBC Group's easy-listening channel, playing mellow Arabic and contemporary tunes." },
      cy: { genre: 'Hawdd / Arabeg', note: 'Sianel gwrando hawdd Grŵp MBC, yn chwarae alawon Arabeg a chyfoes tyner.' },
      fr: { genre: 'Douceur / Arabe', note: 'La chaîne easy-listening du groupe MBC, avec des airs arabes et contemporains tout en douceur.' },
      de: { genre: 'Sanft / Arabisch', note: 'Der Easy-Listening-Kanal der MBC Group mit sanften arabischen und zeitgenössischen Klängen.' },
      it: { genre: 'Rilassante / Arabo', note: 'Il canale easy-listening di MBC Group, con morbide melodie arabe e contemporanee.' },
      es: { genre: 'Suave / Árabe', note: 'El canal de escucha relajada de MBC Group, con suaves melodías árabes y contemporáneas.' },
    } },
  'MBC Loud': { genre: 'Top 40 / 流行', note: 'MBC 集团的流行音乐频道，播放阿拉伯与国际 Top 40 金曲。',
    i18n: {
      en: { genre: 'Top 40 / Pop', note: "MBC Group's pop channel, playing Arabic and international Top 40 hits." },
      cy: { genre: 'Top 40 / Pop', note: 'Sianel bop Grŵp MBC, yn chwarae hitiau Top 40 Arabeg a rhyngwladol.' },
      fr: { genre: 'Top 40 / Pop', note: 'La chaîne pop du groupe MBC, avec les hits arabes et internationaux du Top 40.' },
      de: { genre: 'Top 40 / Pop', note: 'Der Pop-Kanal der MBC Group mit arabischen und internationalen Top-40-Hits.' },
      it: { genre: 'Top 40 / Pop', note: 'Il canale pop di MBC Group, con le hit arabe e internazionali della Top 40.' },
      es: { genre: 'Top 40 / Pop', note: 'El canal pop de MBC Group, con éxitos árabes e internacionales del Top 40.' },
    } },
  'MBC FM': { genre: '阿拉伯流行', note: 'MBC 集团的旗舰阿拉伯语音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "MBC Group's flagship Arabic-language music station." },
      cy: { genre: 'Pop Arabeg', note: 'Prif orsaf gerddoriaeth Arabeg Grŵp MBC.' },
      fr: { genre: 'Pop arabe', note: 'La station de musique arabophone phare du groupe MBC.' },
      de: { genre: 'Arabischer Pop', note: 'Der arabischsprachige Flaggschiff-Musiksender der MBC Group.' },
      it: { genre: 'Pop arabo', note: 'La stazione musicale in lingua araba di punta di MBC Group.' },
      es: { genre: 'Pop árabe', note: 'La emisora musical en árabe insignia de MBC Group.' },
    } },
  'Huna Aden FM': { genre: '综合 / 阿拉伯', note: '亚丁的电台，播放阿拉伯与也门音乐。',
    i18n: {
      en: { genre: 'General / Arabic', note: 'A station from Aden playing Arabic and Yemeni music.' },
      cy: { genre: 'Cyffredinol / Arabeg', note: 'Gorsaf o Aden yn chwarae cerddoriaeth Arabeg ac Iemeni.' },
      fr: { genre: 'Général / Arabe', note: 'Une radio d\u2019Aden diffusant de la musique arabe et yéménite.' },
      de: { genre: 'Allgemein / Arabisch', note: 'Ein Sender aus Aden mit arabischer und jemenitischer Musik.' },
      it: { genre: 'Generalista / Arabo', note: 'Una radio di Aden che trasmette musica araba e yemenita.' },
      es: { genre: 'General / Árabe', note: 'Una emisora de Adén que emite música árabe y yemení.' },
    } },
  "Sana'a Radio": { genre: '综合 / 民歌', note: '萨那的广播电台，播放也门民歌与传统音乐。',
    i18n: {
      en: { genre: 'General / Folk', note: "A Sana'a station playing Yemeni folk and traditional music." },
      cy: { genre: 'Cyffredinol / Gwerin', note: 'Gorsaf o Sana\u2019a yn chwarae cerddoriaeth werin a thraddodiadol Iemeni.' },
      fr: { genre: 'Général / Folk', note: 'Une radio de Sanaa diffusant de la musique folklorique et traditionnelle yéménite.' },
      de: { genre: 'Allgemein / Folk', note: 'Ein Sender aus Sanaa mit jemenitischer Volks- und traditioneller Musik.' },
      it: { genre: 'Generalista / Folk', note: 'Una radio di Sana\u2019a con musica folk e tradizionale yemenita.' },
      es: { genre: 'General / Folk', note: 'Una emisora de Saná con música folclórica y tradicional yemení.' },
    } },
  'Hala FM': { genre: '阿拉伯流行', note: '马斯喀特最受欢迎的阿拉伯语音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "Muscat's most popular Arabic-language music station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth Arabeg fwyaf poblogaidd Muscat.' },
      fr: { genre: 'Pop arabe', note: 'La station de musique arabophone la plus populaire de Mascate.' },
      de: { genre: 'Arabischer Pop', note: 'Der beliebteste arabischsprachige Musiksender in Maskat.' },
      it: { genre: 'Pop arabo', note: 'La stazione musicale in lingua araba più popolare di Mascate.' },
      es: { genre: 'Pop árabe', note: 'La emisora musical en árabe más popular de Mascate.' },
    } },
  'Abu Dhabi FM': { genre: '阿拉伯流行', note: '阿布扎比的阿拉伯语音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "An Arabic-language music station from Abu Dhabi." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth Arabeg o Abu Dhabi.' },
      fr: { genre: 'Pop arabe', note: 'Une station de musique arabophone d\u2019Abou Dabi.' },
      de: { genre: 'Arabischer Pop', note: 'Ein arabischsprachiger Musiksender aus Abu Dhabi.' },
      it: { genre: 'Pop arabo', note: 'Una stazione musicale in lingua araba di Abu Dhabi.' },
      es: { genre: 'Pop árabe', note: 'Una emisora musical en árabe de Abu Dabi.' },
    } },
  'Emarat FM': { genre: '阿拉伯 / 综合', note: '阿联酋的阿拉伯语综合音乐电台。',
    i18n: {
      en: { genre: 'Arabic / General', note: "A general Arabic-language music station from the UAE." },
      cy: { genre: 'Arabeg / Cyffredinol', note: 'Gorsaf gerddoriaeth Arabeg gyffredinol o\u2019r Emiradau.' },
      fr: { genre: 'Arabe / Général', note: 'Une radio musicale généraliste en arabe des Émirats.' },
      de: { genre: 'Arabisch / Allgemein', note: 'Ein allgemeiner arabischsprachiger Musiksender aus den VAE.' },
      it: { genre: 'Arabo / Generalista', note: 'Una radio musicale generalista in arabo degli Emirati.' },
      es: { genre: 'Árabe / General', note: 'Una emisora musical generalista en árabe de los Emiratos.' },
    } },
  'Radio Mirchi Dubai': { genre: '宝莱坞 / 印度流行', note: '迪拜的印度音乐电台。',
    i18n: {
      en: { genre: 'Bollywood / Indian pop', note: "An Indian music station from Dubai." },
      cy: { genre: 'Bollywood / Pop Indiaidd', note: 'Gorsaf gerddoriaeth Indiaidd o Dubai.' },
      fr: { genre: 'Bollywood / Pop indien', note: 'Une station de musique indienne de Dubaï.' },
      de: { genre: 'Bollywood / Indischer Pop', note: 'Ein indischer Musiksender aus Dubai.' },
      it: { genre: 'Bollywood / Pop indiano', note: 'Una stazione di musica indiana di Dubai.' },
      es: { genre: 'Bollywood / Pop indio', note: 'Una emisora de música india de Dubái.' },
    } },
  'Big FM 106.2 UAE': { genre: '印度 / 亚洲流行', note: '阿联酋的亚洲流行音乐电台。',
    i18n: {
      en: { genre: 'Indian / Asian pop', note: "An Asian pop music station from the UAE." },
      cy: { genre: 'Pop Indiaidd / Asiaidd', note: 'Gorsaf gerddoriaeth bop Asiaidd o\u2019r Emiradau.' },
      fr: { genre: 'Pop indien / asiatique', note: 'Une station de pop asiatique des Émirats.' },
      de: { genre: 'Indischer / Asiatischer Pop', note: 'Ein asiatischer Pop-Sender aus den VAE.' },
      it: { genre: 'Pop indiano / asiatico', note: 'Una stazione di pop asiatico degli Emirati.' },
      es: { genre: 'Pop indio / asiático', note: 'Una emisora de pop asiático de los Emiratos.' },
    } },
  'Radio Olive 106.3': { genre: '印度 / 亚洲流行', note: '卡塔尔的印度语音乐电台。',
    i18n: {
      en: { genre: 'Indian / Asian pop', note: "An Indian-language music station from Qatar." },
      cy: { genre: 'Pop Indiaidd / Asiaidd', note: 'Gorsaf gerddoriaeth iaith Indiaidd o Qatar.' },
      fr: { genre: 'Pop indien / asiatique', note: 'Une station de musique en langue indienne du Qatar.' },
      de: { genre: 'Indischer / Asiatischer Pop', note: 'Ein indischsprachiger Musiksender aus Katar.' },
      it: { genre: 'Pop indiano / asiatico', note: 'Una stazione musicale in lingua indiana del Qatar.' },
      es: { genre: 'Pop indio / asiático', note: 'Una emisora musical en idioma indio de Catar.' },
    } },
  'Qabayan Radio 94.3': { genre: '菲律宾 / 综合', note: '卡塔尔的菲律宾社区电台。',
    i18n: {
      en: { genre: 'Filipino / General', note: "A Filipino community station from Qatar." },
      cy: { genre: 'Ffilipinaidd / Cyffredinol', note: 'Gorsaf gymunedol Ffilipinaidd o Qatar.' },
      fr: { genre: 'Philippin / Général', note: 'Une radio communautaire philippine du Qatar.' },
      de: { genre: 'Philippinisch / Allgemein', note: 'Ein philippinischer Gemeinschaftssender aus Katar.' },
      it: { genre: 'Filippino / Generalista', note: 'Una radio comunitaria filippina del Qatar.' },
      es: { genre: 'Filipino / General', note: 'Una emisora comunitaria filipina de Catar.' },
    } },
  'Kuwait General Radio': { genre: '综合 / 萨乌特', note: '科威特国家广播，播放海湾与阿拉伯音乐。',
    i18n: {
      en: { genre: 'General / Sawt', note: "Kuwait's national broadcaster, playing Gulf and Arabic music." },
      cy: { genre: 'Cyffredinol / Sawt', note: 'Darlledwr cenedlaethol Kuwait, yn chwarae cerddoriaeth Gwlff ac Arabeg.' },
      fr: { genre: 'Général / Sawt', note: 'Le diffuseur national du Koweït, avec de la musique du Golfe et arabe.' },
      de: { genre: 'Allgemein / Sawt', note: 'Der nationale Rundfunk Kuwaits mit Golf- und arabischer Musik.' },
      it: { genre: 'Generalista / Sawt', note: 'L\u2019emittente nazionale del Kuwait, con musica del Golfo e araba.' },
      es: { genre: 'General / Sawt', note: 'La emisora nacional de Kuwait, con música del Golfo y árabe.' },
    } },
  'Bahrain FM 93.3': { genre: '阿拉伯 / 海湾', note: '巴林国家广播的音乐频道。',
    i18n: {
      en: { genre: 'Arabic / Gulf', note: "The music channel of Bahrain's national broadcaster." },
      cy: { genre: 'Arabeg / Gwlff', note: 'Sianel gerddoriaeth darlledwr cenedlaethol Bahrain.' },
      fr: { genre: 'Arabe / Golfe', note: 'La chaîne musicale du diffuseur national de Bahreïn.' },
      de: { genre: 'Arabisch / Golf', note: 'Der Musikkanal des nationalen Rundfunks von Bahrain.' },
      it: { genre: 'Arabo / Golfo', note: 'Il canale musicale dell\u2019emittente nazionale del Bahrein.' },
      es: { genre: 'Árabe / Golfo', note: 'El canal musical de la emisora nacional de Baréin.' },
    } },
  'Traditional Radio 95.0': { genre: '传统 / 海湾', note: '巴林的传统音乐频道。',
    i18n: {
      en: { genre: 'Traditional / Gulf', note: "Bahrain's traditional music channel." },
      cy: { genre: 'Traddodiadol / Gwlff', note: 'Sianel gerddoriaeth draddodiadol Bahrain.' },
      fr: { genre: 'Traditionnel / Golfe', note: 'La chaîne de musique traditionnelle de Bahreïn.' },
      de: { genre: 'Traditionell / Golf', note: 'Der traditionelle Musikkanal von Bahrain.' },
      it: { genre: 'Tradizionale / Golfo', note: 'Il canale di musica tradizionale del Bahrein.' },
      es: { genre: 'Tradicional / Golfo', note: 'El canal de música tradicional de Baréin.' },
    } },
  'Sumer FM': { genre: '阿拉伯流行', note: '伊拉克的阿拉伯语流行音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "An Arabic-language pop music station from Iraq." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth bop Arabeg o Irac.' },
      fr: { genre: 'Pop arabe', note: 'Une station de musique pop arabophone d\u2019Irak.' },
      de: { genre: 'Arabischer Pop', note: 'Ein arabischsprachiger Pop-Sender aus dem Irak.' },
      it: { genre: 'Pop arabo', note: 'Una stazione di musica pop in lingua araba dell\u2019Iraq.' },
      es: { genre: 'Pop árabe', note: 'Una emisora de música pop en árabe de Irak.' },
    } },
  'Al Rasheed FM': { genre: '综合 / 伊拉克', note: '巴格达的广播电台，播放伊拉克与阿拉伯音乐。',
    i18n: {
      en: { genre: 'General / Iraqi', note: "A Baghdad station playing Iraqi and Arabic music." },
      cy: { genre: 'Cyffredinol / Iracaidd', note: 'Gorsaf o Baghdad yn chwarae cerddoriaeth Iracaidd ac Arabeg.' },
      fr: { genre: 'Général / Irakien', note: 'Une radio de Bagdad diffusant de la musique irakienne et arabe.' },
      de: { genre: 'Allgemein / Irakisch', note: 'Ein Sender aus Bagdad mit irakischer und arabischer Musik.' },
      it: { genre: 'Generalista / Iracheno', note: 'Una radio di Baghdad con musica irachena e araba.' },
      es: { genre: 'General / Iraquí', note: 'Una emisora de Bagdad con música iraquí y árabe.' },
    } },
  'Sham FM': { genre: '阿拉伯流行', note: '大马士革最受欢迎的阿拉伯语电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "Damascus's most popular Arabic-language station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf Arabeg fwyaf poblogaidd Damascus.' },
      fr: { genre: 'Pop arabe', note: 'La station arabophone la plus populaire de Damas.' },
      de: { genre: 'Arabischer Pop', note: 'Der beliebteste arabischsprachige Sender in Damaskus.' },
      it: { genre: 'Pop arabo', note: 'La stazione in lingua araba più popolare di Damasco.' },
      es: { genre: 'Pop árabe', note: 'La emisora en árabe más popular de Damasco.' },
    } },
  'Farah FM': { genre: '阿拉伯流行', note: '叙利亚的阿拉伯流行音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "A Syrian Arabic pop music station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth bop Arabeg o Syria.' },
      fr: { genre: 'Pop arabe', note: 'Une station de musique pop arabe de Syrie.' },
      de: { genre: 'Arabischer Pop', note: 'Ein arabischer Pop-Sender aus Syrien.' },
      it: { genre: 'Pop arabo', note: 'Una stazione di musica pop araba della Siria.' },
      es: { genre: 'Pop árabe', note: 'Una emisora de música pop árabe de Siria.' },
    } },
  'Al Karma FM': { genre: '阿拉伯 / 综合', note: '叙利亚的阿拉伯音乐电台。',
    i18n: {
      en: { genre: 'Arabic / General', note: "A Syrian Arabic music station." },
      cy: { genre: 'Arabeg / Cyffredinol', note: 'Gorsaf gerddoriaeth Arabeg o Syria.' },
      fr: { genre: 'Arabe / Général', note: 'Une station de musique arabe de Syrie.' },
      de: { genre: 'Arabisch / Allgemein', note: 'Ein arabischer Musiksender aus Syrien.' },
      it: { genre: 'Arabo / Generalista', note: 'Una stazione di musica araba della Siria.' },
      es: { genre: 'Árabe / General', note: 'Una emisora de música árabe de Siria.' },
    } },
  'Virgin Radio Lebanon': { genre: '流行', note: '黎巴嫩的 Virgin 电台，播放国际与阿拉伯流行。',
    i18n: {
      en: { genre: 'Pop', note: "Lebanon's Virgin Radio, playing international and Arabic pop." },
      cy: { genre: 'Pop', note: 'Virgin Radio Libanus, yn chwarae pop rhyngwladol ac Arabeg.' },
      fr: { genre: 'Pop', note: 'Virgin Radio Liban, avec de la pop internationale et arabe.' },
      de: { genre: 'Pop', note: 'Virgin Radio Libanon, mit internationalem und arabischem Pop.' },
      it: { genre: 'Pop', note: 'Virgin Radio Libano, con pop internazionale e arabo.' },
      es: { genre: 'Pop', note: 'Virgin Radio Líbano, con pop internacional y árabe.' },
    } },
  'One FM': { genre: '流行 / 舞曲', note: '黎巴嫩著名的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Dance', note: "A well-known Lebanese pop music station." },
      cy: { genre: 'Pop / Dawns', note: 'Gorsaf gerddoriaeth bop Libanaidd adnabyddus.' },
      fr: { genre: 'Pop / Dance', note: 'Une célèbre station de musique pop libanaise.' },
      de: { genre: 'Pop / Dance', note: 'Ein bekannter libanesischer Pop-Sender.' },
      it: { genre: 'Pop / Dance', note: 'Una nota stazione di musica pop libanese.' },
      es: { genre: 'Pop / Dance', note: 'Una conocida emisora de música pop libanesa.' },
    } },
  'Aghani Aghani 87.9 FM': { genre: '阿拉伯流行', note: '黎巴嫩的阿拉伯流行音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "A Lebanese Arabic pop music station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth bop Arabeg o Libanus.' },
      fr: { genre: 'Pop arabe', note: 'Une station de musique pop arabe du Liban.' },
      de: { genre: 'Arabischer Pop', note: 'Ein arabischer Pop-Sender aus dem Libanon.' },
      it: { genre: 'Pop arabo', note: 'Una stazione di musica pop araba del Libano.' },
      es: { genre: 'Pop árabe', note: 'Una emisora de música pop árabe del Líbano.' },
    } },
  'LBI Radio': { genre: '国际 / 中东', note: '黎巴嫩国际广播电台。',
    i18n: {
      en: { genre: 'International / Middle East', note: "Lebanon's international radio station." },
      cy: { genre: 'Rhyngwladol / Dwyrain Canol', note: 'Gorsaf radio ryngwladol Libanus.' },
      fr: { genre: 'International / Moyen-Orient', note: 'La radio internationale du Liban.' },
      de: { genre: 'International / Naher Osten', note: 'Der internationale Radiosender des Libanon.' },
      it: { genre: 'Internazionale / Medio Oriente', note: 'La radio internazionale del Libano.' },
      es: { genre: 'Internacional / Medio Oriente', note: 'La emisora internacional del Líbano.' },
    } },
  Fairuz: { genre: '费鲁兹 / 阿拉伯经典', note: '全天播放费鲁兹与阿拉伯经典歌曲的专题电台。',
    i18n: {
      en: { genre: 'Fairuz / Arabic classics', note: "A station devoted to Fairuz and classic Arabic songs, all day long." },
      cy: { genre: 'Fairuz / Clasuron Arabeg', note: 'Gorsaf yn gyfan gwbl i Fairuz a chaneuon Arabeg clasurol, drwy\u2019r dydd.' },
      fr: { genre: 'Fairuz / Classiques arabes', note: 'Une radio consacrée à Fairuz et aux classiques arabes, toute la journée.' },
      de: { genre: 'Fairuz / Arabische Klassiker', note: 'Ein Sender rund um Fairuz und arabische Klassiker, den ganzen Tag.' },
      it: { genre: 'Fairuz / Classici arabi', note: 'Una radio dedicata a Fairuz e ai classici arabi, tutto il giorno.' },
      es: { genre: 'Fairuz / Clásicos árabes', note: 'Una emisora dedicada a Fairuz y a los clásicos árabes, todo el día.' },
    } },
  'Mazaj FM': { genre: '阿拉伯流行', note: '约旦最受欢迎的音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "Jordan's most popular music station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth fwyaf poblogaidd Gwlad Iorddonen.' },
      fr: { genre: 'Pop arabe', note: 'La station de musique la plus populaire de Jordanie.' },
      de: { genre: 'Arabischer Pop', note: 'Der beliebteste Musiksender Jordaniens.' },
      it: { genre: 'Pop arabo', note: 'La stazione musicale più popolare della Giordania.' },
      es: { genre: 'Pop árabe', note: 'La emisora musical más popular de Jordania.' },
    } },
  'Radio Dahab': { genre: '阿拉伯 / 经典', note: '约旦的阿拉伯音乐电台。',
    i18n: {
      en: { genre: 'Arabic / Classics', note: "A Jordanian Arabic music station." },
      cy: { genre: 'Arabeg / Clasuron', note: 'Gorsaf gerddoriaeth Arabeg o Wlad Iorddonen.' },
      fr: { genre: 'Arabe / Classiques', note: 'Une station de musique arabe de Jordanie.' },
      de: { genre: 'Arabisch / Klassiker', note: 'Ein arabischer Musiksender aus Jordanien.' },
      it: { genre: 'Arabo / Classici', note: 'Una stazione di musica araba della Giordania.' },
      es: { genre: 'Árabe / Clásicos', note: 'Una emisora de música árabe de Jordania.' },
    } },
  'Mood FM': { genre: '流行', note: '安曼的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop', note: "A pop music station from Amman." },
      cy: { genre: 'Pop', note: 'Gorsaf gerddoriaeth bop o Amman.' },
      fr: { genre: 'Pop', note: 'Une station de musique pop d\u2019Amman.' },
      de: { genre: 'Pop', note: 'Ein Pop-Sender aus Amman.' },
      it: { genre: 'Pop', note: 'Una stazione di musica pop di Amman.' },
      es: { genre: 'Pop', note: 'Una emisora de música pop de Amán.' },
    } },
  'Beat FM': { genre: '流行 / 舞曲', note: '安曼的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Dance', note: "A pop music station from Amman." },
      cy: { genre: 'Pop / Dawns', note: 'Gorsaf gerddoriaeth bop o Amman.' },
      fr: { genre: 'Pop / Dance', note: 'Une station de musique pop d\u2019Amman.' },
      de: { genre: 'Pop / Dance', note: 'Ein Pop-Sender aus Amman.' },
      it: { genre: 'Pop / Dance', note: 'Una stazione di musica pop di Amman.' },
      es: { genre: 'Pop / Dance', note: 'Una emisora de música pop de Amán.' },
    } },
  Galgalatz: { genre: '流行 / 当代', note: '以色列最受欢迎的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Contemporary', note: "Israel's most popular pop music station." },
      cy: { genre: 'Pop / Cyfoes', note: 'Gorsaf gerddoriaeth bop fwyaf poblogaidd Israel.' },
      fr: { genre: 'Pop / Contemporain', note: 'La station de musique pop la plus populaire d\u2019Israël.' },
      de: { genre: 'Pop / Zeitgenössisch', note: 'Israels beliebtester Pop-Sender.' },
      it: { genre: 'Pop / Contemporanea', note: 'La stazione di musica pop più popolare di Israele.' },
      es: { genre: 'Pop / Contemporáneo', note: 'La emisora de música pop más popular de Israel.' },
    } },
  '88FM': { genre: '成人当代 / 爵士', note: '以色列公共广播 KAN 的音乐频道。',
    i18n: {
      en: { genre: 'Adult contemporary / Jazz', note: "The music channel of Israel's public broadcaster KAN." },
      cy: { genre: 'Cyfoes i oedolion / Jazz', note: 'Sianel gerddoriaeth darlledwr cyhoeddus Israel, KAN.' },
      fr: { genre: 'Adulte contemporain / Jazz', note: 'La chaîne musicale du diffuseur public israélien KAN.' },
      de: { genre: 'Adult Contemporary / Jazz', note: 'Der Musikkanal des israelischen öffentlich-rechtlichen Senders KAN.' },
      it: { genre: 'Adult contemporary / Jazz', note: 'Il canale musicale dell\u2019emittente pubblica israeliana KAN.' },
      es: { genre: 'Contemporánea / Jazz', note: 'El canal musical de la emisora pública israelí KAN.' },
    } },
  'KAN Gimel': { genre: '希伯来音乐', note: '以色列公共广播的希伯来语音乐频道。',
    i18n: {
      en: { genre: 'Hebrew music', note: "The Hebrew-language music channel of Israel's public broadcaster." },
      cy: { genre: 'Cerddoriaeth Hebraeg', note: 'Sianel gerddoriaeth Hebraeg darlledwr cyhoeddus Israel.' },
      fr: { genre: 'Musique hébraïque', note: 'La chaîne musicale en hébreu du diffuseur public israélien.' },
      de: { genre: 'Hebräische Musik', note: 'Der hebräischsprachige Musikkanal des israelischen öffentlichen Rundfunks.' },
      it: { genre: 'Musica ebraica', note: 'Il canale musicale in ebraico dell\u2019emittente pubblica israeliana.' },
      es: { genre: 'Música hebrea', note: 'El canal musical en hebreo de la emisora pública israelí.' },
    } },
  ECO99FM: { genre: '流行 / Top 40', note: '以色列的流行音乐电台。',
    i18n: {
      en: { genre: 'Pop / Top 40', note: "An Israeli pop music station." },
      cy: { genre: 'Pop / Top 40', note: 'Gorsaf gerddoriaeth bop o Israel.' },
      fr: { genre: 'Pop / Top 40', note: 'Une station de musique pop israélienne.' },
      de: { genre: 'Pop / Top 40', note: 'Ein israelischer Pop-Sender.' },
      it: { genre: 'Pop / Top 40', note: 'Una stazione di musica pop israeliana.' },
      es: { genre: 'Pop / Top 40', note: 'Una emisora de música pop israelí.' },
    } },
  'Radio 103FM': { genre: '音乐 / 综合', note: '特拉维夫的综合性音乐电台。',
    i18n: {
      en: { genre: 'Music / General', note: "A general music station from Tel Aviv." },
      cy: { genre: 'Cerddoriaeth / Cyffredinol', note: 'Gorsaf gerddoriaeth gyffredinol o Tel Aviv.' },
      fr: { genre: 'Musique / Général', note: 'Une radio musicale généraliste de Tel-Aviv.' },
      de: { genre: 'Musik / Allgemein', note: 'Ein allgemeiner Musiksender aus Tel Aviv.' },
      it: { genre: 'Musica / Generalista', note: 'Una radio musicale generalista di Tel Aviv.' },
      es: { genre: 'Música / General', note: 'Una emisora musical generalista de Tel Aviv.' },
    } },
  'Ze Rock Radio': { genre: '摇滚', note: '以色列的摇滚音乐电台。',
    i18n: {
      en: { genre: 'Rock', note: "An Israeli rock music station." },
      cy: { genre: 'Roc', note: 'Gorsaf gerddoriaeth roc o Israel.' },
      fr: { genre: 'Rock', note: 'Une station de musique rock israélienne.' },
      de: { genre: 'Rock', note: 'Ein israelischer Rock-Sender.' },
      it: { genre: 'Rock', note: 'Una stazione di musica rock israeliana.' },
      es: { genre: 'Rock', note: 'Una emisora de música rock israelí.' },
    } },
  Ajyal: { genre: '阿拉伯流行', note: '巴勒斯坦的阿拉伯流行音乐电台。',
    i18n: {
      en: { genre: 'Arabic pop', note: "A Palestinian Arabic pop music station." },
      cy: { genre: 'Pop Arabeg', note: 'Gorsaf gerddoriaeth bop Arabeg o Balestina.' },
      fr: { genre: 'Pop arabe', note: 'Une station de musique pop arabe de Palestine.' },
      de: { genre: 'Arabischer Pop', note: 'Ein arabischer Pop-Sender aus Palästina.' },
      it: { genre: 'Pop arabo', note: 'Una stazione di musica pop araba della Palestina.' },
      es: { genre: 'Pop árabe', note: 'Una emisora de música pop árabe de Palestina.' },
    } },
  'Raya FM': { genre: '阿拉伯 / 综合', note: '巴勒斯坦的阿拉伯语综合电台。',
    i18n: {
      en: { genre: 'Arabic / General', note: "A Palestinian general Arabic-language station." },
      cy: { genre: 'Arabeg / Cyffredinol', note: 'Gorsaf Arabeg gyffredinol o Balestina.' },
      fr: { genre: 'Arabe / Général', note: 'Une radio généraliste en arabe de Palestine.' },
      de: { genre: 'Arabisch / Allgemein', note: 'Ein allgemeiner arabischsprachiger Sender aus Palästina.' },
      it: { genre: 'Arabo / Generalista', note: 'Una radio generalista in arabo della Palestina.' },
      es: { genre: 'Árabe / General', note: 'Una emisora generalista en árabe de Palestina.' },
    } },
};

// 需要清空 radioNote 的国家（已具备可播放流）
const CLEAR_RADIONOTE = ['yemen'];

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
