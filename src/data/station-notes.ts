// 为 radios.json 中「公认可靠」的著名电台补充的简介（按流地址 url 索引）
// 多数自动采集的电台为小众网络电台，缺乏公认公开信息，故仅收录确有公信力的知名台。
import type { Lang } from '../lib/i18n';

export type StationNote = Partial<Record<Lang, string>> & { 'zh-CN': string };

export const STATION_NOTES: Record<string, StationNote> = {
  'https://media-ssl.musicradio.com/Heart80sMP3': {
    'zh-CN': '英国 Heart 电台的 80 年代金曲频道。',
    'zh-TW': '英國 Heart 電臺的 80 年代金曲頻道。',
    en: "The 1980s hits channel from the UK's Heart radio.",
    fr: 'La chaîne des tubes des années 1980 de la radio britannique Heart.',
    de: 'Der 80er-Jahre-Hits-Kanal des britischen Senders Heart.',
    it: "Il canale dei successi degli anni '80 della radio britannica Heart.",
    es: 'El canal de éxitos de los años 80 de la radio británica Heart.',
    cy: "Sianel hits yr 1980au o orsaf Brydeinig Heart.",
  },
  'https://playerservices.streamtheworld.com/api/livestream-redirect/Los40.mp3': {
    'zh-CN': '西班牙最著名的流行音乐电台，西语流行乐的风向标。',
    'zh-TW': '西班牙最著名的流行音樂電臺，西語流行樂的風向標。',
    en: "Spain's best-known pop music station and a benchmark for Spanish-language pop.",
    fr: 'La station de musique pop la plus célèbre d\'Espagne, référence de la pop hispanophone.',
    de: 'Spaniens bekanntester Popsender und Maßstab für spanischsprachigen Pop.',
    it: "L'emittente di musica pop più celebre della Spagna, riferimento per il pop in lingua spagnola.",
    es: 'La emisora de música pop más conocida de España, referente del pop en español.',
    cy: "Gorsaf gerddoriaeth bop enwocaf Sbaen, a meincnod ar gyfer pop Sbaeneg.",
  },
  'https://sonic.mediatelekom.net/9316/stream': {
    'zh-CN': '西班牙著名的体育电台。',
    'zh-TW': '西班牙著名的體育電臺。',
    en: "Spain's well-known sports radio station.",
    fr: 'La célèbre radio sportive espagnole.',
    de: 'Spaniens bekannter Sportradiosender.',
    it: "La nota emittente radiofonica sportiva spagnola.",
    es: 'La conocida emisora de radio deportiva española.',
    cy: "Gorsaf radio chwaraeon enwog Sbaen.",
  },
  'https://playerservices.streamtheworld.com/api/livestream-redirect/RFMAAC_SC': {
    'zh-CN': '葡萄牙最主要的流行音乐电台。',
    'zh-TW': '葡萄牙最主要的流行音樂電臺。',
    en: "Portugal's leading pop music station.",
    fr: 'La principale station de musique pop du Portugal.',
    de: 'Portugals führender Popsender.',
    it: "La principale emittente di musica pop del Portogallo.",
    es: 'La principal emisora de música pop de Portugal.',
    cy: "Prif orsaf gerddoriaeth bop Portiwgal.",
  },
  'https://stream.rfm.fr/rfm-wr10.aac': {
    'zh-CN': '法国 RFM 电台的流行摇滚频道。',
    'zh-TW': '法國 RFM 電臺的流行搖滾頻道。',
    en: "The pop-rock channel of France's RFM radio.",
    fr: 'La chaîne pop-rock de la radio française RFM.',
    de: 'Der Pop-Rock-Kanal des französischen Senders RFM.',
    it: "Il canale pop-rock dell'emittente francese RFM.",
    es: 'El canal pop-rock de la radio francesa RFM.',
    cy: "Sianel pop-roc radio Ffrengig RFM.",
  },
  'https://eu8.fastcast4u.com/proxy/clyedupq/stream': {
    'zh-CN': '印度最大的商业电台网络旗下的印地语音乐台。',
    'zh-TW': '印度最大的商業電臺網路旗下的印地語音樂臺。',
    en: "A Hindi music station from India's largest commercial radio network.",
    fr: "Une station de musique hindi du plus grand réseau de radio commercial d'Inde.",
    de: 'Ein Hindi-Musiksender aus Indiens größtem kommerziellen Radionetz.',
    it: "Un'emittente di musica hindi della più grande rete radiofonica commerciale dell'India.",
    es: 'Una emisora de música hindi de la mayor red de radio comercial de la India.',
    cy: "Gorsaf gerddoriaeth Hindi o rwydwaith radio masnachol mwyaf India.",
  },
  'https://ice6.somafm.com/groovesalad-128-mp3': {
    'zh-CN': '美国知名的独立网络电台，以氛围与弛放电子乐著称。',
    'zh-TW': '美國知名的獨立網路電臺，以氛圍與弛放電子樂著稱。',
    en: 'A well-known US independent internet station, famous for ambient and downtempo electronic music.',
    fr: 'Station internet indépendante américaine réputée pour l\'électro ambiante et downtempo.',
    de: 'Bekannter US-Internetradiosender für Ambient- und Downtempo-Elektronik.',
    it: "Nota stazione internet indipendente statunitense, celebre per l'elettronica ambient e downtempo.",
    es: 'Conocida emisora de internet independiente estadounidense, célebre por su electrónica ambient y downtempo.',
    cy: "Gorsaf rhyngrwyd annibynnol adnabyddus o'r UDA, yn enwog am gerddoriaeth electronig ambient a downtempo.",
  },
  'https://26183.live.streamtheworld.com/CBUFM_CBC_SC': {
    'zh-CN': '加拿大广播公司 CBC 的音乐频道（温哥华）。',
    'zh-TW': '加拿大廣播公司 CBC 的音樂頻道（溫哥華）。',
    en: 'A music channel of the Canadian Broadcasting Corporation (CBC), from Vancouver.',
    fr: "Une chaîne musicale de la Société Radio-Canada (CBC), depuis Vancouver.",
    de: 'Ein Musiksender der Canadian Broadcasting Corporation (CBC) aus Vancouver.',
    it: "Un canale musicale della Canadian Broadcasting Corporation (CBC), da Vancouver.",
    es: 'Un canal musical de la Canadian Broadcasting Corporation (CBC), desde Vancouver.',
    cy: "Sianel gerddoriaeth o Gorfforaeth Ddarlledu Canada (CBC), o Vancouver.",
  },
};

// —— 品牌台简介 ————————————————————————————————————————————————
// 采集进来的多是各家电台的分频道（Heart 80s、181.FM Old School…），
// 一个个按流地址写不现实，也容易写错。这里按「台名 + 国家」认牌子，
// 命中就给一句该品牌的定性介绍 —— 同一品牌的分频道共用一句不会出错。
//
// 刻意用 ^ 锚定的正则：'Heart' 不能咬到 'Heartland'，'Classic FM' 不能咬到别国的同名台。
// cc 限定国家：'Radio 105' 在意大利是流行大台，在马耳他是另一家，不能同名同注。
//
// 只写中／繁／英／法／德／意／西七种 —— 品牌台听众查的多是这几种语言的资料，
// 其余语言（如威尔士语）回退到中文原文，与 STATION_NOTES 的缺失回退一致。

interface BrandNote {
  re: RegExp;
  /** 限定国家（ISO2）；不给表示不限 */
  cc?: string[];
  note: StationNote;
}

const BRANDS: BrandNote[] = [
  {
    re: /^BBC Radio 1\b/i,
    cc: ['GB'],
    note: {
      'zh-CN': 'BBC 的当代流行台，英国新歌首发与单曲榜的风向标。',
      'zh-TW': 'BBC 的當代流行臺，英國新歌首發與單曲榜的風向標。',
      en: "The BBC's contemporary pop station, a bellwether for new British releases and the singles chart.",
      fr: "La station pop contemporaine de la BBC, référence pour les nouveautés britanniques et le classement des singles.",
      de: 'Der Contemporary-Pop-Sender der BBC, Richtungsgeber für neue britische Musik und die Single-Charts.',
      it: "L'emittente pop contemporanea della BBC, riferimento per le novità britanniche e la classifica dei singoli.",
      es: 'La emisora de pop contemporáneo de la BBC, referente de las novedades británicas y la lista de sencillos.',
    },
  },
  {
    re: /^Capital Dance\b/i,
    cc: ['GB'],
    note: {
      'zh-CN': '英国 Capital FM 旗下的舞曲台，主打浩室与电子流行。',
      'zh-TW': '英國 Capital FM 旗下的舞曲臺，主打浩室與電子流行。',
      en: "Capital FM's dance offshoot, built around house and electronic pop.",
      fr: "L'antenne dance de Capital FM, centrée sur la house et la pop électronique.",
      de: 'Der Dance-Ableger von Capital FM mit House und elektronischem Pop.',
      it: 'Il canale dance di Capital FM, tra house e pop elettronico.',
      es: 'El canal de dance de Capital FM, centrado en house y pop electrónico.',
    },
  },
  {
    re: /^Heart\b/i,
    cc: ['GB'],
    note: {
      'zh-CN': '英国 Heart 网络的分年代频道，主打各年代的流行金曲。',
      'zh-TW': '英國 Heart 網路的分年代頻道，主打各年代的流行金曲。',
      en: "A decade-themed channel from the UK's Heart network, playing pop hits of that era.",
      fr: "Une chaîne thématique du réseau britannique Heart, consacrée aux tubes pop d'une décennie.",
      de: 'Ein Jahrzehnt-Kanal des britischen Heart-Netzwerks mit den Pop-Hits der jeweiligen Ära.',
      it: "Un canale a tema decennio del network britannico Heart, con i successi pop di quell'epoca.",
      es: 'Un canal temático por décadas de la red británica Heart, con los éxitos pop de cada época.',
    },
  },
  {
    re: /^Smooth (Radio|Chill)\b/i,
    cc: ['GB'],
    note: {
      'zh-CN': '英国主打舒缓成人流行的电台，曲风温和，适合长时间收听。',
      'zh-TW': '英國主打舒緩成人流行的電臺，曲風溫和，適合長時間收聽。',
      en: "A UK station of gentle adult pop, made for long, easy listening.",
      fr: "Une station britannique de pop adulte douce, pensée pour une écoute prolongée.",
      de: 'Ein britischer Sender mit sanftem Adult Pop für langes, entspanntes Hören.',
      it: 'Un\'emittente britannica di adult pop morbido, pensata per l\'ascolto prolungato.',
      es: 'Una emisora británica de pop adulto suave, pensada para escuchar durante horas.',
    },
  },
  {
    re: /^Classic FM\b/i,
    cc: ['GB'],
    note: {
      'zh-CN': '英国听众最多的古典音乐电台，曲目通俗易懂。',
      'zh-TW': '英國聽眾最多的古典音樂電臺，曲目通俗易懂。',
      en: "The UK's most listened-to classical station, with an accessible repertoire.",
      fr: "La station classique la plus écoutée du Royaume-Uni, au répertoire accessible.",
      de: 'Der meistgehörte Klassiksender Großbritanniens mit zugänglichem Repertoire.',
      it: 'La radio classica più ascoltata del Regno Unito, con un repertorio accessibile.',
      es: 'La emisora clásica más escuchada del Reino Unido, con un repertorio accesible.',
    },
  },
  {
    re: /^RTL 102\.5\b/i,
    cc: ['IT'],
    note: {
      'zh-CN': '意大利收听率最高的商业流行台之一，新闻与音乐交替播出。',
      'zh-TW': '義大利收聽率最高的商業流行臺之一，新聞與音樂交替播出。',
      en: 'One of Italy\'s most-listened commercial pop stations, alternating news and music.',
      fr: "L'une des radios pop commerciales les plus écoutées d'Italie, alternant info et musique.",
      de: 'Einer der meistgehörten privaten Popsender Italiens, mit Nachrichten und Musik im Wechsel.',
      it: 'Una delle radio pop commerciali più ascoltate in Italia, tra notizie e musica.',
      es: 'Una de las emisoras pop comerciales más escuchadas de Italia, entre noticias y música.',
    },
  },
  {
    re: /^Radio Deejay\b/i,
    cc: ['IT'],
    note: {
      'zh-CN': '意大利最具影响力的流行音乐台之一，以主持人的个性节目著称。',
      'zh-TW': '義大利最具影響力的流行音樂臺之一，以主持人的個性節目著稱。',
      en: 'One of Italy\'s most influential pop stations, known for its strong personality-driven shows.',
      fr: "L'une des radios pop les plus influentes d'Italie, réputée pour ses animateurs à forte personnalité.",
      de: 'Einer der einflussreichsten Popsender Italiens, bekannt für profilierte Moderatoren.',
      it: 'Una delle radio pop più influenti in Italia, nota per i suoi conduttori dalla forte personalità.',
      es: 'Una de las emisoras pop más influyentes de Italia, conocida por sus locutores de gran personalidad.',
    },
  },
  {
    re: /^Radio 105\b/i,
    cc: ['IT'],
    note: {
      'zh-CN': '意大利老牌商业流行台，以排行榜与舞曲节目见长。',
      'zh-TW': '義大利老牌商業流行臺，以排行榜與舞曲節目見長。',
      en: 'A veteran Italian commercial pop station, strong on charts and dance programming.',
      fr: "Une radio pop commerciale italienne historique, forte en hits et en programmes dance.",
      de: 'Ein traditionsreicher italienischer Popsender mit Schwerpunkt auf Charts und Dance.',
      it: 'Storica radio pop commerciale italiana, forte sui chart e sulla dance.',
      es: 'Una veterana emisora pop comercial italiana, fuerte en listas y programas de dance.',
    },
  },
  {
    re: /^m2o\b/i,
    cc: ['IT'],
    note: {
      'zh-CN': '意大利的电子舞曲台，全天候播放浩室与俱乐部音乐。',
      'zh-TW': '義大利的電子舞曲臺，全天候播放浩室與俱樂部音樂。',
      en: 'An Italian electronic dance station, playing house and club music around the clock.',
      fr: "Une radio électro italienne diffusant house et musique club en continu.",
      de: 'Ein italienischer Electronic-Dance-Sender mit House und Clubmusik rund um die Uhr.',
      it: 'Una radio dance elettronica italiana, con house e musica da club 24 ore su 24.',
      es: 'Una emisora italiana de música electrónica de baile, con house y música de club todo el día.',
    },
  },
  {
    re: /^LOS ?40\b/i,
    note: {
      'zh-CN': '西语世界最著名的流行榜单电台网络，各国都有本地版本。',
      'zh-TW': '西語世界最著名的流行榜單電臺網路，各國都有本地版本。',
      en: "The best-known pop chart radio network in the Spanish-speaking world, with local versions in many countries.",
      fr: "Le réseau de radio pop le plus connu du monde hispanophone, décliné en versions locales.",
      de: 'Das bekannteste Pop-Chart-Radionetz der spanischsprachigen Welt, mit lokalen Versionen.',
      it: 'Il network radiofonico pop più noto del mondo ispanofono, con versioni locali.',
      es: 'La red de radio de éxitos pop más conocida del mundo hispanohablante, con versiones locales.',
    },
  },
  {
    re: /^Cadena Dial\b/i,
    cc: ['ES'],
    note: {
      'zh-CN': '西班牙专播西语抒情与浪漫流行曲的电台。',
      'zh-TW': '西班牙專播西語抒情與浪漫流行曲的電臺。',
      en: 'A Spanish station devoted to Spanish-language ballads and romantic pop.',
      fr: 'Une radio espagnole consacrée aux ballades et à la pop romantique en espagnol.',
      de: 'Ein spanischer Sender für spanischsprachige Balladen und romantischen Pop.',
      it: 'Un\'emittente spagnola dedicata alle ballate e al pop romantico in spagnolo.',
      es: 'Una emisora española dedicada a las baladas y al pop romántico en español.',
    },
  },
  {
    re: /^SomaFM\b/i,
    note: {
      'zh-CN': '旧金山的独立网络电台，每个频道对应一种氛围，无广告。',
      'zh-TW': '舊金山的獨立網路電臺，每個頻道對應一種氛圍，無廣告。',
      en: 'A listener-supported San Francisco internet station: one mood per channel, no ads.',
      fr: "Une radio internet indépendante de San Francisco : une ambiance par canal, sans publicité.",
      de: 'Ein unabhängiger Internetsender aus San Francisco: ein Kanal pro Stimmung, ohne Werbung.',
      it: 'Una radio internet indipendente di San Francisco: un canale per atmosfera, senza pubblicità.',
      es: 'Una emisora de internet independiente de San Francisco: un canal por ambiente, sin publicidad.',
    },
  },
  {
    re: /^181\.FM\b/i,
    note: {
      'zh-CN': '美国老牌网络电台，按年代与流派分成几十个频道。',
      'zh-TW': '美國老牌網路電臺，按年代與流派分成幾十個頻道。',
      en: 'A long-running US internet radio network with dozens of channels by era and genre.',
      fr: "Un réseau de radio internet américain de longue date, des dizaines de canaux par époque et par genre.",
      de: 'Ein traditionsreiches US-Internetradio mit Dutzenden Kanälen nach Jahrzehnt und Genre.',
      it: 'Storico network radiofonico internet statunitense, con decine di canali per epoca e genere.',
      es: 'Una veterana red de radio por internet estadounidense, con decenas de canales por época y género.',
    },
  },
  {
    re: /^Radio Paradise\b/i,
    note: {
      'zh-CN': '加州的无广告网络电台，由听众赞助，曲目跨流派手工编排。',
      'zh-TW': '加州的无廣告網路電臺，由聽眾贊助，曲目跨流派手工編排。',
      en: 'An ad-free, listener-supported internet station from California, with hand-picked cross-genre playlists.',
      fr: "Une radio internet californienne sans publicité, financée par les auditeurs, aux playlists éclectiques ciselées.",
      de: 'Ein werbefreier, hörerfinanzierter Internetsender aus Kalifornien mit handverlesenen Genre-Mixen.',
      it: 'Una radio internet californiana senza pubblicità, sostenuta dagli ascoltatori, con scalette eclettiche curate a mano.',
      es: 'Una emisora de internet de California sin publicidad, financiada por oyentes, con listas eclécticas seleccionadas a mano.',
    },
  },
];

/**
 * 取某台的简介：先按流地址精确匹配，再按「台名 + 国家」认品牌。
 * @param iso 该国 ISO2，用于限定品牌（同名不同国的情况很常见）
 */
export function noteOf(url: string, name: string, iso?: string): StationNote | undefined {
  const exact = STATION_NOTES[url];
  if (exact) return exact;
  for (const b of BRANDS) {
    if (b.cc && iso && !b.cc.includes(iso)) continue;
    if (b.re.test(name)) return b.note;
  }
  return undefined;
}
