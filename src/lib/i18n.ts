// 多语言（8 种）配置：站点 UI 文案 + 每种语言对应的「家喻户晓的音乐名言/诗句」作为 slogan
export type Lang = 'zh-CN' | 'zh-TW' | 'en' | 'cy' | 'fr' | 'de' | 'it' | 'es';

export interface LangMeta {
  id: Lang;
  /** 语言自名（显示在切换器中） */
  label: string;
  /** 语言对应英文名（辅助） */
  en: string;
}

export const LANGS: LangMeta[] = [
  { id: 'zh-CN', label: '简体中文', en: 'Simplified Chinese' },
  { id: 'zh-TW', label: '繁體中文', en: 'Traditional Chinese' },
  { id: 'en', label: 'English', en: 'English' },
  { id: 'cy', label: 'Cymraeg', en: 'Welsh' },
  { id: 'fr', label: 'Français', en: 'French' },
  { id: 'de', label: 'Deutsch', en: 'German' },
  { id: 'it', label: 'Italiano', en: 'Italian' },
  { id: 'es', label: 'Español', en: 'Spanish' },
];

export interface Translation {
  slogan: string;
  sloganAttr: string;
  subtitle: string;
  heroDesc: string;
  start: string;
  guestbookBtn: string;
  exploreKicker: string;
  exploreTitle: string;
  exploreCount: string;
  continentsTitle: string;
  navHome: string;
  navExplore: string;
  navGuestbook: string;
  footerAbout: string;
  footerExplore: string;
  footerBrowse: string;
  footerIndex: string;
  footerHome: string;
  footerRadioNote: string;
}

export const TRANSLATIONS: Record<Lang, Translation> = {
  'zh-CN': {
    slogan: '如听仙乐耳暂明',
    sloganAttr: '白居易《琵琶行》',
    subtitle: 'World Music Radio · 一场横跨六大洲的耳朵之旅',
    heroDesc:
      '我们搜罗世界各国的音乐电台，以大洲为纲、子区域为目，带你巡礼古典的庄严、爵士的自由、流行的炽热与民族音乐的千年回响。点开一个国家，让它的历史人文、音乐家与电台流，在同一片声景里与你相遇。',
    start: '开始巡礼',
    guestbookBtn: '去留言板',
    exploreKicker: 'Explore',
    exploreTitle: '按大洲巡礼',
    exploreCount: '个国家与地区',
    continentsTitle: '按大洲巡礼',
    navHome: '首页',
    navExplore: '大洲巡礼',
    navGuestbook: '留言板',
    footerAbout: '关于',
    footerExplore: '巡礼',
    footerBrowse: '按大洲浏览',
    footerIndex: '音乐电台索引',
    footerHome: '返回首页',
    footerRadioNote: '电台流地址来自公开的 radio-browser 数据库，版权归各电台所有。',
  },
  'zh-TW': {
    slogan: '如聽仙樂耳暫明',
    sloganAttr: '白居易《琵琶行》',
    subtitle: 'World Music Radio · 一場橫跨六大洲的耳朵之旅',
    heroDesc:
      '我們蒐羅世界各國的音樂電台，以大洲為綱、子區域為目，帶你巡禮古典的莊嚴、爵士的自由、流行的熾熱與民族音樂的千年迴響。點開一個國家，讓它的歷史人文、音樂家與電台流，在同一片聲景裡與你相遇。',
    start: '開始巡禮',
    guestbookBtn: '去留言板',
    exploreKicker: 'Explore',
    exploreTitle: '按大洲巡禮',
    exploreCount: '個國家與地區',
    continentsTitle: '按大洲巡禮',
    navHome: '首頁',
    navExplore: '大洲巡禮',
    navGuestbook: '留言板',
    footerAbout: '關於',
    footerExplore: '巡禮',
    footerBrowse: '按大洲瀏覽',
    footerIndex: '音樂電台索引',
    footerHome: '返回首頁',
    footerRadioNote: '電台流網址來自公開的 radio-browser 資料庫，版權歸各電台所有。',
  },
  en: {
    slogan: 'If music be the food of love, play on.',
    sloganAttr: 'William Shakespeare, Twelfth Night',
    subtitle: 'World Music Radio · A journey for the ears across six continents',
    heroDesc:
      'We gather music radio stations from every country on Earth — organised by continent and subregion — to guide you through the grandeur of classical, the freedom of jazz, the heat of pop, and the thousand-year echo of folk music. Open a country and let its history, musicians and radio streams meet you in a single soundscape.',
    start: 'Start the journey',
    guestbookBtn: 'Guestbook',
    exploreKicker: 'Explore',
    exploreTitle: 'Explore by Continent',
    exploreCount: 'countries & regions',
    continentsTitle: 'Explore by Continent',
    navHome: 'Home',
    navExplore: 'Continents',
    navGuestbook: 'Guestbook',
    footerAbout: 'About',
    footerExplore: 'Journey',
    footerBrowse: 'Browse by continent',
    footerIndex: 'Radio index',
    footerHome: 'Back to home',
    footerRadioNote: 'Stream URLs come from the public radio-browser database; all rights belong to the stations.',
  },
  cy: {
    slogan: 'Gwlad beirdd a chantorion, enwogion o fri.',
    sloganAttr: 'Hen Wlad Fy Nhadau (anthem genedlaethol Cymru)',
    subtitle: 'World Music Radio · Taith i\'r glust ar draws chwe chyfandir',
    heroDesc:
      'Rydym yn casglu gorsafoedd radio cerddoriaeth o bob gwlad ar y ddaear — wedi\'u trefnu yn ôl cyfandir ac isranbarth — i\'ch tywys trwy fawredd cerddoriaeth glasurol, rhyddid jazz, gwres pop, a thraddodiad gwerin mil o flynyddoedd.',
    start: 'Dechrau\'r daith',
    guestbookBtn: 'Llyfr ymwelwyr',
    exploreKicker: 'Archwilio',
    exploreTitle: 'Archwilio yn ôl Cyfandir',
    exploreCount: 'gwlad a rhanbarth',
    continentsTitle: 'Archwilio yn ôl Cyfandir',
    navHome: 'Hafan',
    navExplore: 'Cyfandiroedd',
    navGuestbook: 'Llyfr ymwelwyr',
    footerAbout: 'Amdanom',
    footerExplore: 'Taith',
    footerBrowse: 'Pori yn ôl cyfandir',
    footerIndex: 'Mynegai radio',
    footerHome: 'Yn ôl i\'r hafan',
    footerRadioNote: 'Daw URLau\'r ffrydiau o gronfa gyhoeddus radio-browser; mae\'r holl hawliau\'n perthyn i\'r gorsafoedd.',
  },
  fr: {
    slogan: 'La musique adoucit les mœurs.',
    sloganAttr: 'Proverbe français',
    subtitle: 'World Music Radio · Un voyage pour les oreilles à travers six continents',
    heroDesc:
      'Nous réunissons les radios musicales de tous les pays du monde — classées par continent et sous-région — pour vous guider à travers la grandeur du classique, la liberté du jazz, la chaleur de la pop et l\'écho millénaire des musiques traditionnelles. Ouvrez un pays et laissez son histoire, ses musiciens et ses flux radio vous rejoindre dans un même paysage sonore.',
    start: 'Commencer le voyage',
    guestbookBtn: 'Livre d\'or',
    exploreKicker: 'Explorer',
    exploreTitle: 'Explorer par continent',
    exploreCount: 'pays et régions',
    continentsTitle: 'Explorer par continent',
    navHome: 'Accueil',
    navExplore: 'Continents',
    navGuestbook: 'Livre d\'or',
    footerAbout: 'À propos',
    footerExplore: 'Voyage',
    footerBrowse: 'Parcourir par continent',
    footerIndex: 'Index des radios',
    footerHome: 'Retour à l\'accueil',
    footerRadioNote: 'Les flux proviennent de la base publique radio-browser ; tous les droits appartiennent aux stations.',
  },
  de: {
    slogan: 'Ohne Musik wäre das Leben ein Irrtum.',
    sloganAttr: 'Friedrich Nietzsche',
    subtitle: 'World Music Radio · Eine Reise für die Ohren durch sechs Kontinente',
    heroDesc:
      'Wir sammeln Musikradios aus allen Ländern der Erde — geordnet nach Kontinent und Subregion — und führen Sie durch die Erhabenheit der Klassik, die Freiheit des Jazz, die Hitze des Pop und das tausendjährige Echo der Volksmusik. Öffnen Sie ein Land und lassen Sie seine Geschichte, Musiker und Radiostreams in einer einzigen Klanglandschaft zusammenkommen.',
    start: 'Reise beginnen',
    guestbookBtn: 'Gästebuch',
    exploreKicker: 'Entdecken',
    exploreTitle: 'Nach Kontinent entdecken',
    exploreCount: 'Länder & Regionen',
    continentsTitle: 'Nach Kontinent entdecken',
    navHome: 'Startseite',
    navExplore: 'Kontinente',
    navGuestbook: 'Gästebuch',
    footerAbout: 'Über',
    footerExplore: 'Reise',
    footerBrowse: 'Nach Kontinent durchsuchen',
    footerIndex: 'Radio-Index',
    footerHome: 'Zurück zur Startseite',
    footerRadioNote: 'Stream-URLs stammen aus der öffentlichen radio-browser-Datenbank; alle Rechte liegen bei den Sendern.',
  },
  it: {
    slogan: 'La musica è il linguaggio dell\'anima.',
    sloganAttr: 'Detto attribuito a Ludwig van Beethoven',
    subtitle: 'World Music Radio · Un viaggio per le orecchie attraverso sei continenti',
    heroDesc:
      'Raccogliamo radio musicali da ogni paese del mondo — ordinate per continente e sottoregione — per guidarti attraverso la grandezza della classica, la libertà del jazz, il calore del pop e l\'eco millenaria della musica popolare. Apri un paese e lascia che la sua storia, i suoi musicisti e i suoi flussi radio ti incontrino in un unico paesaggio sonoro.',
    start: 'Inizia il viaggio',
    guestbookBtn: 'Libro degli ospiti',
    exploreKicker: 'Esplora',
    exploreTitle: 'Esplora per continente',
    exploreCount: 'paesi e regioni',
    continentsTitle: 'Esplora per continente',
    navHome: 'Home',
    navExplore: 'Continenti',
    navGuestbook: 'Libro degli ospiti',
    footerAbout: 'Informazioni',
    footerExplore: 'Viaggio',
    footerBrowse: 'Sfoglia per continente',
    footerIndex: 'Indice delle radio',
    footerHome: 'Torna alla home',
    footerRadioNote: 'Gli URL dei flussi provengono dal database pubblico radio-browser; tutti i diritti appartengono alle emittenti.',
  },
  es: {
    slogan: 'Quien canta, sus males espanta.',
    sloganAttr: 'Refrán español',
    subtitle: 'World Music Radio · Un viaje para los oídos por seis continentes',
    heroDesc:
      'Reunimos emisoras de música de todos los países del mundo — ordenadas por continente y subregión — para guiarte por la grandeza de la clásica, la libertad del jazz, el calor del pop y el eco milenario de la música folclórica. Abre un país y deja que su historia, sus músicos y sus emisoras te encuentren en un mismo paisaje sonoro.',
    start: 'Empezar el viaje',
    guestbookBtn: 'Libro de visitas',
    exploreKicker: 'Explorar',
    exploreTitle: 'Explorar por continente',
    exploreCount: 'países y regiones',
    continentsTitle: 'Explorar por continente',
    navHome: 'Inicio',
    navExplore: 'Continentes',
    navGuestbook: 'Libro de visitas',
    footerAbout: 'Acerca de',
    footerExplore: 'Viaje',
    footerBrowse: 'Explorar por continente',
    footerIndex: 'Índice de emisoras',
    footerHome: 'Volver al inicio',
    footerRadioNote: 'Las URL de los flujos provienen de la base de datos pública radio-browser; todos los derechos pertenecen a las emisoras.',
  },
};

const STORAGE_KEY = 'mr_lang';

export function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'zh-CN';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && saved in TRANSLATIONS) return saved as Lang;
  const nav = window.navigator.language;
  if (nav && nav.toLowerCase().startsWith('zh')) {
    return nav.toLowerCase().includes('tw') || nav.toLowerCase().includes('hk') ? 'zh-TW' : 'zh-CN';
  }
  return 'zh-CN';
}

export function saveLang(lang: Lang) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, lang);
}
