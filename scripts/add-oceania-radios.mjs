// 一次性：为大洋洲（澳、新以外）8 国补可播放电台链接 + 各语言简介
// 1) 写回 oceania.ts 的 notableRadios（替换 radioNote）
// 2) 同步 source.json + 7 语言 i18n 的 radios 数组（zh-TW 用 opencc 简繁转换），并清空 radioNote
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OCEANIA_TS = join(ROOT, 'src', 'data', 'regions', 'oceania.ts');
const I18N_DIR = join(ROOT, 'src', 'data', 'i18n');

// slug -> 电台条目数组（zh-CN name/genre/note + url，含各语言译文）
const COUNTRIES = {
  vanuatu: [
    {
      name: 'Paradise 98FM', genre: '综合 / 音乐', note: '瓦努阿图广播公司（VBTC）旗下的综合音乐电台。',
      url: 'https://radio.vbtc.vu/paradisefm',
      i18n: {
        en: { genre: 'General / Music', note: "A general music station of the Vanuatu Broadcasting and Television Corporation (VBTC)." },
        cy: { genre: 'Cyffredinol / Cerddoriaeth', note: "Gorsaf gerddoriaeth gyffredinol Corfforaeth Ddarlledu a Theledu Vanuatu (VBTC)." },
        fr: { genre: 'Général / Musique', note: 'Une station musicale généraliste de la Vanuatu Broadcasting and Television Corporation (VBTC).' },
        de: { genre: 'Allgemein / Musik', note: 'Ein allgemeiner Musiksender der Vanuatu Broadcasting and Television Corporation (VBTC).' },
        it: { genre: 'Generalista / Musica', note: "Un'emittente musicale generalista della Vanuatu Broadcasting and Television Corporation (VBTC)." },
        es: { genre: 'General / Música', note: 'Una emisora musical generalista de la Vanuatu Broadcasting and Television Corporation (VBTC).' },
      },
    },
    {
      name: 'Femme Pawa FM', genre: '社区 / 女性', note: '瓦努阿图广播公司（VBTC）旗下以女性与社区节目为主的电台。',
      url: 'https://radio.vbtc.vu/femmefm',
      i18n: {
        en: { genre: 'Community / Women', note: 'A VBTC station focused on women and community programming.' },
        cy: { genre: 'Cymuned / Merched', note: "Gorsaf VBTC sy'n canolbwyntio ar raglenni merched a chymuned." },
        fr: { genre: 'Communautaire / Femmes', note: 'Une station de la VBTC axée sur les programmes destinés aux femmes et à la communauté.' },
        de: { genre: 'Community / Frauen', note: 'Ein VBTC-Sender mit Schwerpunkt auf Frauen- und Community-Programmen.' },
        it: { genre: 'Comunitaria / Donne', note: 'Una stazione VBTC dedicata a programmi per donne e comunità.' },
        es: { genre: 'Comunitaria / Mujeres', note: 'Una emisora de VBTC centrada en programas para mujeres y la comunidad.' },
      },
    },
    {
      name: 'BUZZ FM 96.3', genre: '流行', note: '瓦努阿图《每日邮报》（Vanuatu Daily Post）旗下的流行音乐电台。',
      url: 'https://streamer.dailypost.vu/live',
      i18n: {
        en: { genre: 'Pop', note: 'A pop music station run by the Vanuatu Daily Post.' },
        cy: { genre: 'Pop', note: 'Gorsaf gerddoriaeth bop a reolir gan y Vanuatu Daily Post.' },
        fr: { genre: 'Pop', note: 'Une station de musique pop gérée par le Vanuatu Daily Post.' },
        de: { genre: 'Pop', note: 'Ein Popmusik-Sender, betrieben von der Vanuatu Daily Post.' },
        it: { genre: 'Pop', note: 'Una stazione di musica pop gestita dal Vanuatu Daily Post.' },
        es: { genre: 'Pop', note: 'Una emisora de música pop gestionada por el Vanuatu Daily Post.' },
      },
    },
  ],
  kiribati: [
    {
      name: 'Radio Kiribati', genre: '综合 / 文化', note: '基里巴斯的国家广播电台。',
      url: 'https://streamer5.rightclickitservices.com:19790/stream',
      i18n: {
        en: { genre: 'General / Culture', note: "Kiribati's national public radio station." },
        cy: { genre: 'Cyffredinol / Diwylliant', note: 'Gorsaf radio gyhoeddus genedlaethol Kiribati.' },
        fr: { genre: 'Général / Culture', note: 'La radio publique nationale de Kiribati.' },
        de: { genre: 'Allgemein / Kultur', note: 'Der nationale öffentliche Rundfunk von Kiribati.' },
        it: { genre: 'Generalista / Cultura', note: 'La radio pubblica nazionale di Kiribati.' },
        es: { genre: 'General / Cultura', note: 'La radio pública nacional de Kiribati.' },
      },
    },
  ],
  palau: [
    {
      name: 'UpBeat.pw', genre: '流行 / 当代', note: '帕劳的网络电台，播放当代流行音乐。',
      url: 'https://live.upbeat.pw/',
      i18n: {
        en: { genre: 'Pop / Contemporary', note: 'An internet radio station from Palau playing contemporary pop.' },
        cy: { genre: 'Pop / Cyfoes', note: 'Gorsaf radio rhyngrwyd o Palau yn chwarae pop cyfoes.' },
        fr: { genre: 'Pop / Contemporain', note: 'Une radio en ligne de Palaos diffusant de la pop contemporaine.' },
        de: { genre: 'Pop / Zeitgenössisch', note: 'Ein Internetradio aus Palau mit zeitgenössischem Pop.' },
        it: { genre: 'Pop / Contemporanea', note: 'Una radio internet di Palau che trasmette pop contemporaneo.' },
        es: { genre: 'Pop / Contemporánea', note: 'Una radio por internet de Palaos que emite pop contemporáneo.' },
      },
    },
  ],
  tonga: [
    {
      name: "Kalofiama 'O E 'Amanaki", genre: '社区', note: '汤加的社区电台。',
      url: 'https://stream.zeno.fm/v4kaet5ab1ntv',
      i18n: {
        en: { genre: 'Community', note: 'A community radio station in Tonga.' },
        cy: { genre: 'Cymuned', note: 'Gorsaf radio gymunedol yn Tonga.' },
        fr: { genre: 'Communautaire', note: 'Une radio communautaire des Tonga.' },
        de: { genre: 'Community', note: 'Ein Community-Radiosender in Tonga.' },
        it: { genre: 'Comunitaria', note: 'Una radio comunitaria di Tonga.' },
        es: { genre: 'Comunitaria', note: 'Una radio comunitaria de Tonga.' },
      },
    },
    {
      name: 'Letio Tonga', genre: '综合', note: '以汤加语播音的社区电台。',
      url: 'https://stream.zeno.fm/wnd22q3485quv',
      i18n: {
        en: { genre: 'General', note: 'A community station broadcasting in Tongan.' },
        cy: { genre: 'Cyffredinol', note: 'Gorsaf gymunedol yn darlledu yn y Tongeg.' },
        fr: { genre: 'Général', note: 'Une radio communautaire diffusant en tongien.' },
        de: { genre: 'Allgemein', note: 'Ein Community-Sender, der auf Tonganisch sendet.' },
        it: { genre: 'Generalista', note: 'Una radio comunitaria che trasmette in tongano.' },
        es: { genre: 'General', note: 'Una radio comunitaria que emite en tongano.' },
      },
    },
  ],
  'papua-new-guinea': [
    {
      name: 'FM 100', genre: '流行 / 综合', note: '巴布亚新几内亚的商业流行音乐电台。',
      url: 'https://online.fm100.com.pg/stream',
      i18n: {
        en: { genre: 'Pop / General', note: 'A commercial pop music station in Papua New Guinea.' },
        cy: { genre: 'Pop / Cyffredinol', note: 'Gorsaf fasnachol gerddoriaeth bop yn Papua New Guinea.' },
        fr: { genre: 'Pop / Général', note: 'Une radio commerciale de musique pop en Papouasie-Nouvelle-Guinée.' },
        de: { genre: 'Pop / Allgemein', note: 'Ein kommerzieller Popmusik-Sender in Papua-Neuguinea.' },
        it: { genre: 'Pop / Generalista', note: 'Una stazione commerciale di musica pop in Papua Nuova Guinea.' },
        es: { genre: 'Pop / General', note: 'Una emisora comercial de música pop en Papúa Nueva Guinea.' },
      },
    },
  ],
  samoa: [
    {
      name: 'Radio 2AP', genre: '综合 / 文化', note: '萨摩亚广播公司（SBC）的全国电台。',
      url: 'https://stream.zeno.fm/vupcb07gc2zuv',
      i18n: {
        en: { genre: 'General / Culture', note: 'The national radio of the Samoa Broadcasting Corporation (SBC).' },
        cy: { genre: 'Cyffredinol / Diwylliant', note: 'Radio genedlaethol Corfforaeth Ddarlledu Samoa (SBC).' },
        fr: { genre: 'Général / Culture', note: 'La radio nationale de la Samoa Broadcasting Corporation (SBC).' },
        de: { genre: 'Allgemein / Kultur', note: 'Der nationale Rundfunk der Samoa Broadcasting Corporation (SBC).' },
        it: { genre: 'Generalista / Cultura', note: 'La radio nazionale della Samoa Broadcasting Corporation (SBC).' },
        es: { genre: 'General / Cultura', note: 'La radio nacional de la Samoa Broadcasting Corporation (SBC).' },
      },
    },
  ],
  fiji: [
    {
      name: 'The Vox Populi', genre: '校园 / 综合', note: '斐济大学（UniFiji）的校园电台。',
      url: 'https://s5.radio.co/s9ccc1e3bd/listen',
      i18n: {
        en: { genre: 'Campus / General', note: 'The campus radio station of the University of Fiji (UniFiji).' },
        cy: { genre: 'Campws / Cyffredinol', note: 'Gorsaf radio campws Prifysgol Fiji (UniFiji).' },
        fr: { genre: 'Campus / Général', note: "La radio du campus de l'Université des Fidji (UniFiji)." },
        de: { genre: 'Campus / Allgemein', note: 'Der Campus-Radiosender der University of Fiji (UniFiji).' },
        it: { genre: 'Campus / Generalista', note: "La radio universitaria dell'Università delle Figi (UniFiji)." },
        es: { genre: 'Campus / General', note: 'La radio del campus de la Universidad de Fiyi (UniFiji).' },
      },
    },
  ],
  'marshall-islands': [
    {
      name: 'Offshore Radio', genre: '摇滚', note: '马绍尔群岛的网络电台，播放经典与另类摇滚。',
      url: 'https://live.offshoreradio.net/listen/offshore_radio/radio.mp3',
      i18n: {
        en: { genre: 'Rock', note: 'An internet radio station from the Marshall Islands playing classic and alternative rock.' },
        cy: { genre: 'Roc', note: 'Gorsaf radio rhyngrwyd o Ynysoedd Marshall yn chwarae roc clasurol ac amgen.' },
        fr: { genre: 'Rock', note: 'Une radio en ligne des Îles Marshall diffusant du rock classique et alternatif.' },
        de: { genre: 'Rock', note: 'Ein Internetradio von den Marshallinseln mit Classic- und Alternative-Rock.' },
        it: { genre: 'Rock', note: 'Una radio internet delle Isole Marshall che trasmette rock classico e alternativo.' },
        es: { genre: 'Rock', note: 'Una radio por internet de las Islas Marshall que emite rock clásico y alternativo.' },
      },
    },
  ],
};

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function buildNotableRadios(radios) {
  const lines = radios.map((r) => `      { name: '${esc(r.name)}', genre: '${esc(r.genre)}', note: '${esc(r.note)}', url: '${r.url}', hls: false },`);
  return [`    notableRadios: [`, ...lines, `    ],`].join('\n');
}

// ---------- 1. oceania.ts ----------
let ts = readFileSync(OCEANIA_TS, 'utf8');
const tsLines = ts.split('\n');
let currentSlug = null;
for (let i = 0; i < tsLines.length; i++) {
  const slugM = tsLines[i].match(/^\s*slug:\s*'([^']+)'/);
  if (slugM) currentSlug = slugM[1];
  if (!currentSlug || !COUNTRIES[currentSlug]) continue;
  if (/^\s*radioNote:/.test(tsLines[i])) {
    tsLines[i] = buildNotableRadios(COUNTRIES[currentSlug]);
    console.log('oceania.ts: 写入', currentSlug, COUNTRIES[currentSlug].length, '个电台');
  }
}
writeFileSync(OCEANIA_TS, tsLines.join('\n'), 'utf8');

// ---------- 2. i18n ----------
const cvt = OpenCC.Converter({ from: 'cn', to: 'tw' });
const T = (s) => (typeof s === 'string' ? cvt(s) : s);
const writeJSON = (p, data, pretty) =>
  writeFileSync(p, (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n', 'utf8');

// 各语言的 radios 条目
function radioForLang(r, lang) {
  if (lang === 'zh-CN') return { name: r.name, genre: r.genre, note: r.note };
  if (lang === 'zh-TW') return { name: T(r.name), genre: T(r.genre), note: T(r.note) };
  const t = r.i18n[lang];
  return { name: r.name, genre: t.genre, note: t.note };
}

const LANGS = ['en', 'cy', 'fr', 'de', 'it', 'es', 'zh-TW'];

// source.json（多行缩进）
{
  const src = JSON.parse(readFileSync(join(I18N_DIR, 'source.json'), 'utf8'));
  for (const slug of Object.keys(COUNTRIES)) {
    src[slug].radios = COUNTRIES[slug].map((r) => radioForLang(r, 'zh-CN'));
    src[slug].radioNote = '';
  }
  writeJSON(join(I18N_DIR, 'source.json'), src, true);
  console.log('source.json: 已更新', Object.keys(COUNTRIES).join(', '));
}
// 7 语言（单行）
for (const lang of LANGS) {
  const file = join(I18N_DIR, `${lang}.json`);
  const d = JSON.parse(readFileSync(file, 'utf8'));
  for (const slug of Object.keys(COUNTRIES)) {
    d[slug].radios = COUNTRIES[slug].map((r) => radioForLang(r, lang));
    d[slug].radioNote = '';
  }
  writeJSON(file, d, false);
  console.log(`${lang}.json: 已更新`);
}
console.log('完成。');
