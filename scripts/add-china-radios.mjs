// 批量新增中国页电台：央广 8 频道 + 43 城市音乐台（全部 https+CORS* 已验证）
// 同时同步 8 语言 i18n（name/genre/note）
import * as OpenCC from 'opencc-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASIA_TS = join(ROOT, 'src', 'data', 'regions', 'asia.ts');
const DIR = join(ROOT, 'src', 'data', 'i18n');

// 每条：name/genre/url/hls/city（央广 city=null）
const RADIOS = [
  // ---- 央广 CNR（satellitepull，HLS，CORS*）----
  { name: 'CNR-1 中国之声（中央人民广播电台）', genre: '综合 / 新闻', url: 'https://satellitepull.cnr.cn/live/wxzgzs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-2 经济之声（中央人民广播电台）', genre: '财经 / 综合', url: 'https://satellitepull.cnr.cn/live/wxjjzs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-4 经典音乐广播（中央人民广播电台）', genre: '古典 / 经典', url: 'https://satellitepull.cnr.cn/live/wxdszs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-6 神州之声（中央人民广播电台）', genre: '综合 / 音乐', url: 'https://satellitepull.cnr.cn/live/wxszzs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-8 民族之声（中央人民广播电台）', genre: '民族音乐', url: 'https://satellitepull.cnr.cn/live/wxmzzs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-9 藏语广播（中央人民广播电台）', genre: '民族 / 藏语', url: 'https://satellitepull.cnr.cn/live/wxzygb/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-10 老年之声（中央人民广播电台）', genre: '怀旧 / 综合', url: 'https://satellitepull.cnr.cn/live/wxlnzs/playlist.m3u8', hls: true, city: null },
  { name: 'CNR-15 中国乡村之声（中央人民广播电台）', genre: '乡村 / 民谣', url: 'https://satellitepull.cnr.cn/live/wxxczs/playlist.m3u8', hls: true, city: null },
  // ---- 官方 HLS 城市音乐台 ----
  { name: '北京音乐广播 FM97.4', genre: '流行', url: 'https://brtv-radiolive.rbc.cn/alive/fm974.m3u8', hls: true, city: '北京' },
  { name: '河北音乐广播', genre: '流行', url: 'https://radio.pull.hebtv.com/live/hebyy.m3u8', hls: true, city: '河北' },
  { name: '河南音乐广播', genre: '流行', url: 'https://stream.hndt.com/live/yinyue/playlist.m3u8', hls: true, city: '河南' },
  { name: '哈尔滨音乐广播', genre: '流行', url: 'https://stream.hrbtv.net/yypl/playlist.m3u8', hls: true, city: '哈尔滨' },
  // ---- 蜻蜓FM https mp3 城市音乐台 ----
  { name: '上海流行音乐广播 动感101 FM101.7', genre: '流行', url: 'https://lhttp-hw.qtfm.cn/live/274/64k.mp3', hls: false, city: '上海' },
  { name: '重庆音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/647/64k.mp3', hls: false, city: '重庆' },
  { name: '广州金曲音乐广播', genre: '流行 / 金曲', url: 'https://lhttp.qingting.fm/live/20192/64k.mp3', hls: false, city: '广州' },
  { name: '深圳音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1271/64k.mp3', hls: false, city: '深圳' },
  { name: '南京音乐广播', genre: '流行', url: 'https://lhttp-hw.qtfm.cn/live/4963/64k.mp3', hls: false, city: '南京' },
  { name: '杭州音乐时尚广播', genre: '流行', url: 'https://lhttp-hw.qtfm.cn/live/15318146/64k.mp3', hls: false, city: '杭州' },
  { name: '武汉经典音乐广播', genre: '经典', url: 'https://lhttp.qtfm.cn/live/1297/64k.mp3', hls: false, city: '武汉' },
  { name: '成都天府音乐听 FM91.4', genre: '音乐 / 文艺', url: 'https://lhttp.qtfm.cn/live/4891/64k.mp3', hls: false, city: '成都' },
  { name: '陕西音乐广播（西安）', genre: '流行', url: 'https://lhttp.qtfm.cn/live/4873/64k.mp3', hls: false, city: '西安' },
  { name: '沈阳经典音乐广播', genre: '经典', url: 'https://lhttp.qingting.fm/live/5022520/64k.mp3', hls: false, city: '沈阳' },
  { name: '石家庄音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1654/64k.mp3', hls: false, city: '石家庄' },
  { name: '太原音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1185/64k.mp3', hls: false, city: '太原' },
  { name: '郑州音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/4921/64k.mp3', hls: false, city: '郑州' },
  { name: '济南音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1671/64k.mp3', hls: false, city: '济南' },
  { name: '长沙音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/20847/64k.mp3', hls: false, city: '长沙' },
  { name: '南昌交通音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1804/64k.mp3', hls: false, city: '南昌' },
  { name: '安徽音乐广播（合肥）', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1947/64k.mp3', hls: false, city: '合肥' },
  { name: '云南音乐广播（昆明）', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1929/64k.mp3', hls: false, city: '昆明' },
  { name: '乌鲁木齐旅游音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1920/64k.mp3', hls: false, city: '乌鲁木齐' },
  { name: '南宁交通音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/20767/64k.mp3', hls: false, city: '南宁' },
  { name: '海口音乐广播', genre: '流行', url: 'https://lhttp-hw.qtfm.cn/live/20010/64k.mp3', hls: false, city: '海口' },
  { name: '苏州都市音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/2803/64k.mp3', hls: false, city: '苏州' },
  { name: '无锡音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/2779/64k.mp3', hls: false, city: '无锡' },
  { name: '大连音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1084/64k.mp3', hls: false, city: '大连' },
  { name: '厦门音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1739/64k.mp3', hls: false, city: '厦门' },
  { name: '温州音乐之声', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1149/64k.mp3', hls: false, city: '温州' },
  { name: '青岛音乐体育广播', genre: '流行 / 体育', url: 'https://lhttp.qingting.fm/live/1677/64k.mp3', hls: false, city: '青岛' },
  { name: '烟台音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1683/64k.mp3', hls: false, city: '烟台' },
  { name: '唐山音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/4871/64k.mp3', hls: false, city: '唐山' },
  { name: '洛阳音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1226/64k.mp3', hls: false, city: '洛阳' },
  { name: '扬州经济音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/2805/64k.mp3', hls: false, city: '扬州' },
  { name: '嘉兴音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1136/64k.mp3', hls: false, city: '嘉兴' },
  { name: '台州音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1144/64k.mp3', hls: false, city: '台州' },
  { name: '徐州音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/4923/64k.mp3', hls: false, city: '徐州' },
  { name: '湖北经典音乐广播', genre: '经典', url: 'https://lhttp.qtfm.cn/live/1296/64k.mp3', hls: false, city: '湖北' },
  { name: '四川音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/1110/64k.mp3', hls: false, city: '四川' },
  { name: '黑龙江音乐广播', genre: '流行', url: 'https://lhttp.qtfm.cn/live/4969/64k.mp3', hls: false, city: '黑龙江' },
  { name: '辽宁音乐广播', genre: '流行', url: 'https://lhttp.qingting.fm/live/1101/64k.mp3', hls: false, city: '辽宁' },
  { name: '江西文艺音乐广播', genre: '流行 / 文艺', url: 'https://lhttp.qtfm.cn/live/1802/64k.mp3', hls: false, city: '江西' },
];

// genre 中文 → 6 语言
const GENRE = {
  '综合 / 新闻': { en: 'General / News', cy: 'Cyffredinol / Newyddion', fr: 'Général / Actualités', de: 'Allgemein / Nachrichten', it: 'Generale / Notizie', es: 'General / Noticias' },
  '财经 / 综合': { en: 'Business / Variety', cy: 'Busnes / Amrywiaeth', fr: 'Affaires / Variété', de: 'Wirtschaft / Allgemein', it: 'Economia / Varietà', es: 'Negocios / Variedad' },
  '古典 / 经典': { en: 'Classical / Classic', cy: 'Clasurol / Clasur', fr: 'Classique', de: 'Klassik', it: 'Classica / Classico', es: 'Clásica / Clásico' },
  '综合 / 音乐': { en: 'General / Music', cy: 'Cyffredinol / Cerddoriaeth', fr: 'Général / Musique', de: 'Allgemein / Musik', it: 'Generale / Musica', es: 'General / Música' },
  '民族音乐': { en: 'Folk Music', cy: 'Cerddoriaeth Werin', fr: 'Musique folklorique', de: 'Volksmusik', it: 'Musica folk', es: 'Música folk' },
  '民族 / 藏语': { en: 'Ethnic / Tibetan', cy: 'Ethnig / Tibeteg', fr: 'Ethnique / Tibétain', de: 'Ethnisch / Tibetisch', it: 'Etnica / Tibetana', es: 'Étnica / Tibetano' },
  '怀旧 / 综合': { en: 'Nostalgia / Variety', cy: 'Hiraeth / Amrywiaeth', fr: 'Nostalgie / Variété', de: 'Nostalgie / Allgemein', it: 'Nostalgia / Varietà', es: 'Nostalgia / Variedad' },
  '乡村 / 民谣': { en: 'Country / Folk', cy: 'Gwlad / Gwerin', fr: 'Country / Folk', de: 'Country / Folk', it: 'Country / Folk', es: 'Country / Folk' },
  '流行': { en: 'Pop', cy: 'Pop', fr: 'Pop', de: 'Pop', it: 'Pop', es: 'Pop' },
  '流行 / 金曲': { en: 'Pop / Golden Oldies', cy: 'Pop / Hen Ganeuon', fr: 'Pop / Vieilles chansons', de: 'Pop / Oldies', it: 'Pop / Vecchi successi', es: 'Pop / Viejos éxitos' },
  '经典': { en: 'Classic', cy: 'Clasur', fr: 'Classique', de: 'Klassisch', it: 'Classico', es: 'Clásico' },
  '音乐 / 文艺': { en: 'Music / Arts', cy: 'Cerddoriaeth / Celfyddydau', fr: 'Musique / Arts', de: 'Musik / Kunst', it: 'Musica / Arti', es: 'Música / Artes' },
  '流行 / 体育': { en: 'Pop / Sports', cy: 'Pop / Chwaraeon', fr: 'Pop / Sports', de: 'Pop / Sport', it: 'Pop / Sport', es: 'Pop / Deportes' },
  '流行 / 文艺': { en: 'Pop / Arts', cy: 'Pop / Celfyddydau', fr: 'Pop / Arts', de: 'Pop / Kunst', it: 'Pop / Arti', es: 'Pop / Artes' },
};

// 城市名 → 6 语言（拼音拉丁化）
const CITY = {
  '北京': { en: 'Beijing', cy: 'Beijing', fr: 'Pékin', de: 'Peking', it: 'Pechino', es: 'Pekín' },
  '河北': { en: 'Hebei', cy: 'Hebei', fr: 'Hebei', de: 'Hebei', it: 'Hebei', es: 'Hebei' },
  '河南': { en: 'Henan', cy: 'Henan', fr: 'Henan', de: 'Henan', it: 'Henan', es: 'Henan' },
  '哈尔滨': { en: 'Harbin', cy: 'Harbin', fr: 'Harbin', de: 'Harbin', it: 'Harbin', es: 'Harbin' },
  '上海': { en: 'Shanghai', cy: 'Shanghai', fr: 'Shanghai', de: 'Shanghai', it: 'Shanghai', es: 'Shanghái' },
  '重庆': { en: 'Chongqing', cy: 'Chongqing', fr: 'Chongqing', de: 'Chongqing', it: 'Chongqing', es: 'Chongqing' },
  '广州': { en: 'Guangzhou', cy: 'Guangzhou', fr: 'Canton', de: 'Guangzhou', it: 'Canton', es: 'Cantón' },
  '深圳': { en: 'Shenzhen', cy: 'Shenzhen', fr: 'Shenzhen', de: 'Shenzhen', it: 'Shenzhen', es: 'Shenzhen' },
  '南京': { en: 'Nanjing', cy: 'Nanjing', fr: 'Nankin', de: 'Nanjing', it: 'Nanchino', es: 'Nankín' },
  '杭州': { en: 'Hangzhou', cy: 'Hangzhou', fr: 'Hangzhou', de: 'Hangzhou', it: 'Hangzhou', es: 'Hangzhou' },
  '武汉': { en: 'Wuhan', cy: 'Wuhan', fr: 'Wuhan', de: 'Wuhan', it: 'Wuhan', es: 'Wuhan' },
  '成都': { en: 'Chengdu', cy: 'Chengdu', fr: 'Chengdu', de: 'Chengdu', it: 'Chengdu', es: 'Chengdu' },
  '西安': { en: "Xi'an", cy: "Xi'an", fr: "Xi'an", de: "Xi'an", it: "Xi'an", es: "Xi'an" },
  '沈阳': { en: 'Shenyang', cy: 'Shenyang', fr: 'Shenyang', de: 'Shenyang', it: 'Shenyang', es: 'Shenyang' },
  '石家庄': { en: 'Shijiazhuang', cy: 'Shijiazhuang', fr: 'Shijiazhuang', de: 'Shijiazhuang', it: 'Shijiazhuang', es: 'Shijiazhuang' },
  '太原': { en: 'Taiyuan', cy: 'Taiyuan', fr: 'Taiyuan', de: 'Taiyuan', it: 'Taiyuan', es: 'Taiyuan' },
  '郑州': { en: 'Zhengzhou', cy: 'Zhengzhou', fr: 'Zhengzhou', de: 'Zhengzhou', it: 'Zhengzhou', es: 'Zhengzhou' },
  '济南': { en: 'Jinan', cy: 'Jinan', fr: 'Jinan', de: 'Jinan', it: 'Jinan', es: 'Jinan' },
  '长沙': { en: 'Changsha', cy: 'Changsha', fr: 'Changsha', de: 'Changsha', it: 'Changsha', es: 'Changsha' },
  '南昌': { en: 'Nanchang', cy: 'Nanchang', fr: 'Nanchang', de: 'Nanchang', it: 'Nanchang', es: 'Nanchang' },
  '合肥': { en: 'Hefei', cy: 'Hefei', fr: 'Hefei', de: 'Hefei', it: 'Hefei', es: 'Hefei' },
  '昆明': { en: 'Kunming', cy: 'Kunming', fr: 'Kunming', de: 'Kunming', it: 'Kunming', es: 'Kunming' },
  '乌鲁木齐': { en: 'Urumqi', cy: 'Urumqi', fr: 'Urumqi', de: 'Urumqi', it: 'Urumqi', es: 'Urumqi' },
  '南宁': { en: 'Nanning', cy: 'Nanning', fr: 'Nanning', de: 'Nanning', it: 'Nanning', es: 'Nanning' },
  '海口': { en: 'Haikou', cy: 'Haikou', fr: 'Haikou', de: 'Haikou', it: 'Haikou', es: 'Haikou' },
  '苏州': { en: 'Suzhou', cy: 'Suzhou', fr: 'Suzhou', de: 'Suzhou', it: 'Suzhou', es: 'Suzhou' },
  '无锡': { en: 'Wuxi', cy: 'Wuxi', fr: 'Wuxi', de: 'Wuxi', it: 'Wuxi', es: 'Wuxi' },
  '大连': { en: 'Dalian', cy: 'Dalian', fr: 'Dalian', de: 'Dalian', it: 'Dalian', es: 'Dalian' },
  '厦门': { en: 'Xiamen', cy: 'Xiamen', fr: 'Xiamen', de: 'Xiamen', it: 'Xiamen', es: 'Xiamen' },
  '温州': { en: 'Wenzhou', cy: 'Wenzhou', fr: 'Wenzhou', de: 'Wenzhou', it: 'Wenzhou', es: 'Wenzhou' },
  '青岛': { en: 'Qingdao', cy: 'Qingdao', fr: 'Qingdao', de: 'Qingdao', it: 'Qingdao', es: 'Qingdao' },
  '烟台': { en: 'Yantai', cy: 'Yantai', fr: 'Yantai', de: 'Yantai', it: 'Yantai', es: 'Yantai' },
  '唐山': { en: 'Tangshan', cy: 'Tangshan', fr: 'Tangshan', de: 'Tangshan', it: 'Tangshan', es: 'Tangshan' },
  '洛阳': { en: 'Luoyang', cy: 'Luoyang', fr: 'Luoyang', de: 'Luoyang', it: 'Luoyang', es: 'Luoyang' },
  '扬州': { en: 'Yangzhou', cy: 'Yangzhou', fr: 'Yangzhou', de: 'Yangzhou', it: 'Yangzhou', es: 'Yangzhou' },
  '嘉兴': { en: 'Jiaxing', cy: 'Jiaxing', fr: 'Jiaxing', de: 'Jiaxing', it: 'Jiaxing', es: 'Jiaxing' },
  '台州': { en: 'Taizhou', cy: 'Taizhou', fr: 'Taizhou', de: 'Taizhou', it: 'Taizhou', es: 'Taizhou' },
  '徐州': { en: 'Xuzhou', cy: 'Xuzhou', fr: 'Xuzhou', de: 'Xuzhou', it: 'Xuzhou', es: 'Xuzhou' },
  '湖北': { en: 'Hubei', cy: 'Hubei', fr: 'Hubei', de: 'Hubei', it: 'Hubei', es: 'Hubei' },
  '四川': { en: 'Sichuan', cy: 'Sichuan', fr: 'Sichuan', de: 'Sichuan', it: 'Sichuan', es: 'Sichuan' },
  '黑龙江': { en: 'Heilongjiang', cy: 'Heilongjiang', fr: 'Heilongjiang', de: 'Heilongjiang', it: 'Heilongjiang', es: 'Heilongjiang' },
  '辽宁': { en: 'Liaoning', cy: 'Liaoning', fr: 'Liaoning', de: 'Liaoning', it: 'Liaoning', es: 'Liaoning' },
  '江西': { en: 'Jiangxi', cy: 'Jiangxi', fr: 'Jiangxi', de: 'Jiangxi', it: 'Jiangxi', es: 'Jiangxi' },
};

function cityNote(city) {
  // 城市台 note 中文
  return `${city}的音乐广播电台。`;
}
function cityNoteL(city, lang) {
  const c = CITY[city][lang];
  const t = {
    en: (c) => `Music radio station in ${c}, China.`,
    cy: (c) => `Gorsaf radio gerddoriaeth yn ${c}, Tsieina.`,
    fr: (c) => `Station de radio musicale à ${c}, Chine.`,
    de: (c) => `Musikradiosender in ${c}, China.`,
    it: (c) => `Emittente radiofonica musicale a ${c}, Cina.`,
    es: (c) => `Emisora de radio musical en ${c}, China.`,
  }[lang];
  return t(c);
}
function cnrNote(genre) {
  return `中央人民广播电台的${genre}频道。`;
}
function cnrNoteL(genre, lang) {
  const g = GENRE[genre][lang];
  const t = {
    en: (g) => `A ${g} channel of China National Radio (CNR).`,
    cy: (g) => `Sianel ${g} o Radio Genedlaethol Tsieina (CNR).`,
    fr: (g) => `Chaîne ${g} de la Radio nationale de Chine (CNR).`,
    de: (g) => `${g}-Kanal von China National Radio (CNR).`,
    it: (g) => `Canale ${g} di China National Radio (CNR).`,
    es: (g) => `Canal ${g} de Radio Nacional de China (CNR).`,
  }[lang];
  return t(g);
}

// 每条电台的 note（zh 源 + 6 语言）
function noteOf(r) {
  const zh = r.city ? cityNote(r.city) : cnrNote(r.genre);
  const langs = {};
  for (const lang of ['en', 'cy', 'fr', 'de', 'it', 'es']) {
    langs[lang] = r.city ? cityNoteL(r.city, lang) : cnrNoteL(r.genre, lang);
  }
  return { zh, langs };
}

// ---- 1. 生成 asia.ts 追加行 ----
function tsLine(r) {
  const note = noteOf(r).zh;
  const url = r.url.replace(/'/g, "\\'");
  const name = r.name.replace(/'/g, "\\'");
  const genre = r.genre.replace(/'/g, "\\'");
  const n = note.replace(/'/g, "\\'");
  return `      { name: '${name}', genre: '${genre}', url: '${url}', hls: ${r.hls}, note: '${n}' },`;
}

const ANCHOR = "      { name: '正声广播电台 FM104（中国台湾）', genre: '综合 / 音乐', url: 'https://flv.ccdntech.com/live/_definst_/mp4:vod117_Live/live1/playlist.m3u8', hls: true, note: '中国台湾的综合广播电台，播放音乐与生活节目。' },\n";

const asia = readFileSync(ASIA_TS, 'utf8');
if (!asia.includes(ANCHOR)) {
  console.error('✗ 未找到 asia.ts 锚点，中止');
  process.exit(1);
}
const append = RADIOS.map(tsLine).join('\n') + '\n';
const newAsia = asia.replace(ANCHOR, ANCHOR + append);
writeFileSync(ASIA_TS, newAsia, 'utf8');
console.log(`✓ asia.ts 已追加 ${RADIOS.length} 条电台`);

// ---- 2. 更新 i18n 8 语言 ----
function writeJSON(path, data, pretty) {
  writeFileSync(path, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');
}

// source.json（多行）
const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
for (const r of RADIOS) {
  src.china.radios.push({ name: r.name, genre: r.genre, note: noteOf(r).zh });
}
writeJSON(join(DIR, 'source.json'), src, true);

// zh-TW（opencc 简繁）
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const tw = JSON.parse(readFileSync(join(DIR, 'zh-TW.json'), 'utf8'));
for (const r of RADIOS) {
  tw.china.radios.push({ name: T(r.name), genre: T(r.genre), note: T(noteOf(r).zh) });
}
writeJSON(join(DIR, 'zh-TW.json'), tw, false);

// 6 语言
for (const lang of ['en', 'cy', 'fr', 'de', 'it', 'es']) {
  const file = join(DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  for (const r of RADIOS) {
    d.china.radios.push({ name: r.name, genre: GENRE[r.genre][lang], note: noteOf(r).langs[lang] });
  }
  writeJSON(file, d, false);
}

console.log('✓ i18n 8 语言已同步');
console.log(`  源条目：source.json radios = ${src.china.radios.length} 条`);
