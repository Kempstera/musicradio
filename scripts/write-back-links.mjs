// 把已确认的链接写回 region TS 文件（为无 url 的 notableRadios 条目追加 url + hls）
import { readFileSync, writeFileSync } from 'node:fs';

// slug|name -> { url, hls }（已人工核验 + 通过 verify 确认可播放）
const CONFIRMED = {
  'belgium|Klara': { url: 'https://icecast.vrtcdn.be/klara-high.mp3', hls: false },
  'czech-republic|ČRo Vltava': { url: 'https://icecast5.play.cz/cro3-128.mp3', hls: false },
  'estonia|Klassikaraadio': { url: 'https://icecast.err.ee/klassikaraadio.mp3', hls: false },
  'finland|Yle Radio 1': { url: 'https://icecast.live.yle.fi/radio/YleRadio1Hifi/icecast.audio', hls: false },
  'greece|ERT Third Programme': { url: 'https://radiostreaming.ert.gr/ert-trito', hls: false },
  'hungary|Bartók Rádió (MR3)': { url: 'https://icast.connectmedia.hu/4741/mr3.mp3', hls: false },
  'italy|Rai Radio 3': { url: 'https://icestreaming.rai.it/3.mp3', hls: false },
  'luxembourg|Radio 100,7': { url: 'https://100komma7.cast.addradio.de/100komma7/live/mp3/128/stream.mp3', hls: false },
  'netherlands|NPO Radio 4': { url: 'https://icecast.omroep.nl/radio4-bb-mp3', hls: false },
  'norway|NRK Jazz': { url: 'https://cdn0-47115-liveicecast0.dna.contentdelivery.net/jazz_mp3_h', hls: false },
  'switzerland|RTS Espace 2': { url: 'https://stream.srg-ssr.ch/m/espace-2/mp3_128', hls: false },
  'south-korea|EBS FM': { url: 'https://ebsonairiosaod.ebs.co.kr/fmradiobandiaod/bandiappaac/playlist.m3u8', hls: true },
  'turkey|TRT Radyo 3': { url: 'https://radio-trtradyo3.live.trt.com.tr/master.m3u8', hls: true },
  'turkey|TRT Türk Sanat Müziği': { url: 'https://radio-trtturku.live.trt.com.tr/master.m3u8', hls: true },
  'indonesia|RRI Pro 2': { url: 'https://stream-node2.rri.co.id/streaming/21/9221/rritjpinangpro2.mp3', hls: false },
  'malaysia|Radio Klasik': { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_KLASIKAAC_SC', hls: false },
  'singapore|Symphony 92.4': { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SYMPHONY924AAC.aac', hls: false },
  'singapore|Mediacorp CLASS 95': { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CLASS95AAC.aac', hls: false },
  'laos|Lao National Radio': { url: 'https://radio.lnr.org.la/fm103', hls: false },
  'lebanon|Radio Liban / Voice of Lebanon': { url: 'https://media2.streambrothers.com:2020/stream/8194', hls: false },
  'canada|ICI Musique': { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/CBFXFM_SRC.mp3', hls: false },
  'australia|ABC Classic': { url: 'https://mediaserviceslive.akamaized.net/hls/live/2038316/classicfmnsw/masterhq.m3u8', hls: true },
  'australia|Double J': { url: 'https://mediaserviceslive.akamaized.net/hls/live/2108567/doublejnsw/v0-221.m3u8', hls: true },
  'new-zealand|RNZ Concert': { url: 'https://stream-ice.radionz.co.nz/concert_aac64', hls: false },
  'new-zealand|RNZ National': { url: 'https://stream-ice.radionz.co.nz/national_aac64', hls: false },
  'nigeria|Cool FM / Rhythm FM Lagos': { url: 'https://coolfmlagos969-atunwadigital.streamguys1.com/coolfmlagos969', hls: false },
  'ghana|Joy FM / Peace FM': { url: 'https://mmg.streamguys1.com/JoyFM-mp3', hls: false },
  'cape-verde|RTC / RCV': { url: 'https://a3.asurahosting.com:6980/radio.mp3', hls: false },
  'ethiopia|Fana FM / Sheger FM': { url: 'https://stream.zenolive.com/y91n1vtbaw5tv', hls: false },
  'tanzania|Clouds FM / Radio One': { url: 'https://radioonetanzania.radioca.st/stream', hls: false },
  'uganda|Radio Simba / Capital FM': { url: 'https://capitalfm.cloudrad.io/stream', hls: false },
  'mauritius|MBC Radio': { url: 'https://radio.mbconline.xyz/hls/radiomaurice.m3u8', hls: true },
  'dr-congo|RTNC / Top Congo FM': { url: 'https://topcongofm2.ice.infomaniak.ch/topcongofm2-64.mp3', hls: false },
  'south-africa|Metro FM / SAfm': { url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/METROFMAAC.aac', hls: false },
  'zimbabwe|ZBC Radio / Star FM': { url: 'https://edge.iono.fm/xice/159_medium.aac', hls: false },
  'serbia|Radio Belgrade 2': { url: 'https://rtsradio-live.morescreens.com/RTS_2_002/audio/chunklist.m3u8', hls: true },
  'slovenia|RTV Slovenija - ARS': { url: 'https://mp3.rtvslo.si/ars', hls: false },
  'moldova|Radio Moldova': { url: 'https://radiolive.trm.md:8001/hls_rmt/tineret.m3u8', hls: true },
  'india|Radio City / AIR FM': { url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio00564kbps.m3u8', hls: true },
};

// slug -> name -> { url, hls }
const map = {};
for (const [k, v] of Object.entries(CONFIRMED)) {
  const idx = k.indexOf('|');
  const slug = k.slice(0, idx);
  const name = k.slice(idx + 1);
  (map[slug] ||= {})[name] = v;
}

const files = ['africa', 'americas', 'asia', 'europe1', 'europe2', 'oceania'];
let totalApplied = 0;
const appliedList = [];

for (const f of files) {
  const path = `src/data/regions/${f}.ts`;
  const lines = readFileSync(path, 'utf8').split('\n');
  let currentSlug = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const slugM = line.match(/^\s*slug:\s*'([^']+)'/);
    if (slugM) currentSlug = slugM[1];
    if (!currentSlug || !map[currentSlug]) continue;
    const nameM = line.match(/name:\s*'([^']+)'/);
    if (!nameM) continue;
    const name = nameM[1];
    const entry = map[currentSlug][name];
    if (!entry) continue;
    if (line.includes('url:')) continue;          // 已有 url
    if (!line.includes('genre:')) continue;        // 只处理电台条目
    const lastBrace = line.lastIndexOf('}');
    if (lastBrace === -1) continue;
    const insert = `, url: '${entry.url}', hls: ${entry.hls}`;
    lines[i] = line.slice(0, lastBrace) + insert + line.slice(lastBrace);
    delete map[currentSlug][name];
    totalApplied++;
    appliedList.push(`${currentSlug} | ${name}`);
  }
  writeFileSync(path, lines.join('\n'), 'utf8');
}

console.log(`写回 ${totalApplied} 条链接`);
for (const s of appliedList) console.log('  ' + s);

let remain = 0;
for (const slug in map) for (const name in map[slug]) { console.log('  [未应用]', slug, '|', name); remain++; }
console.log(`未应用: ${remain}`);
