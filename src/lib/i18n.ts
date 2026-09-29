// 多语言（8 种）配置：站点 UI 文案 + 每种语言对应的「家喻户晓的音乐名言/诗句」作为 slogan
import type { ContinentId, SubregionId } from './country';

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
  footerAboutLine: string;
  footerExplore: string;
  footerBrowse: string;
  footerIndex: string;
  footerHome: string;
  footerRadioNote: string;
  footerIncluded: string;
  footerStats: string;
  footerStats2: string;
  regionUnit: string;
  subregionUnit: string;
  subdivisionUnit: string;
  listenRadio: string;
  // 国家详情页
  histSection: string;
  musicSection: string;
  musiciansSection: string;
  radiosSection: string;
  radioIntroKicker: string;
  radioNoStreamNote: string;
  radioNoStreamTag: string;
  capitalLabel: string;
  wikiTitle: string;
  radioEmptyFallback: string;
  // 登录 / 注册
  authLoginRegister: string;
  authLogout: string;
  authClose: string;
  authWelcome: string;
  authSubtitle: string;
  authLogin: string;
  authRegister: string;
  authUsername: string;
  authUsernamePlaceholder: string;
  authEmail: string;
  authPassword: string;
  authPasswordPlaceholder: string;
  authBusy: string;
  authRegisterSuccess: string;
  authLoginSuccess: string;
  authErrorFallback: string;
  // 留言板
  boardLabel: string;
  boardPlaceholder: string;
  boardPublishing: string;
  boardPublish: string;
  boardLoading: string;
  boardEmpty: string;
  boardLoadError: string;
  boardPostError: string;
  boardAnonymous: string;
  boardJustNow: string;
  boardMinutesAgo: string;
  boardHoursAgo: string;
  // 访客计数
  visitorLabel: string;
  visitorTitle: string;
}

const zhCN: Translation = {
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
  footerAboutLine: '跨越时区与语言，将散落在全球的优质电台一一打捞 @Jeff 2026.09',
  footerExplore: '巡礼',
  footerBrowse: '按大洲浏览',
  footerIndex: '音乐电台索引',
  footerHome: '返回首页',
  footerRadioNote: '电台流地址来自公开的互联网数据库，版权归各电台所有。',
  footerIncluded: '已收录',
  footerStats: '个国家与地区，',
  footerStats2: '个可在线收听的音乐电台。',
  regionUnit: '个国家/地区',
  subregionUnit: '国',
  subdivisionUnit: '个分区',
  listenRadio: '收听电台 →',
  histSection: '历史人文',
  musicSection: '音乐史',
  musiciansSection: '音乐家及主要作品',
  radiosSection: '主要音乐电台',
  radioIntroKicker: '电台简介',
  radioNoStreamNote: '以下电台暂未收录可直接播放的在线流，仅作简介参考。',
  radioNoStreamTag: '暂无在线流',
  capitalLabel: '首都',
  wikiTitle: '维基百科',
  radioEmptyFallback: '暂未收录该地区的在线电台流，敬请期待。',
  authLoginRegister: '登录 / 注册',
  authLogout: '退出',
  authClose: '关闭',
  authWelcome: '欢迎来到仙乐电台',
  authSubtitle: '登录后即可在留言板分享你的听乐感悟',
  authLogin: '登录',
  authRegister: '注册',
  authUsername: '昵称（可选）',
  authUsernamePlaceholder: '你的昵称',
  authEmail: '邮箱',
  authPassword: '密码',
  authPasswordPlaceholder: '至少 6 位',
  authBusy: '请稍候…',
  authRegisterSuccess: '注册成功！请前往邮箱查收确认邮件（部分邮箱可能自动登录）。',
  authLoginSuccess: '登录成功',
  authErrorFallback: '操作失败，请重试',
  boardLabel: '写下你的听乐感悟',
  boardPlaceholder: '你此刻正在听哪一国的音乐？有什么想分享的感受？',
  boardPublishing: '发布中…',
  boardPublish: '发布留言',
  boardLoading: '加载留言中…',
  boardEmpty: '还没有留言，来做第一个分享的人吧。',
  boardLoadError: '加载留言失败',
  boardPostError: '发布失败，请重试',
  boardAnonymous: '匿名乐友',
  boardJustNow: '刚刚',
  boardMinutesAgo: '分钟前',
  boardHoursAgo: '小时前',
  visitorLabel: '访客',
  visitorTitle: '累计访客',
};

const zhTW: Translation = {
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
  footerAboutLine: '跨越時區與語言，將散落在全球的優質電台一一打撈 @Jeff 2026.09',
  footerExplore: '巡禮',
  footerBrowse: '按大洲瀏覽',
  footerIndex: '音樂電台索引',
  footerHome: '返回首頁',
  footerRadioNote: '電台流網址來自公開的網際網路資料庫，版權歸各電台所有。',
  footerIncluded: '已收錄',
  footerStats: '個國家與地區，',
  footerStats2: '個可線上收聽的音樂電台。',
  regionUnit: '個國家／地區',
  subregionUnit: '國',
  subdivisionUnit: '個分區',
  listenRadio: '收聽電台 →',
  histSection: '歷史人文',
  musicSection: '音樂史',
  musiciansSection: '音樂家及主要作品',
  radiosSection: '主要音樂電台',
  radioIntroKicker: '電台簡介',
  radioNoStreamNote: '以下電台暫未收錄可直接播放的線上串流，僅作簡介參考。',
  radioNoStreamTag: '暫無線上串流',
  capitalLabel: '首都',
  wikiTitle: '維基百科',
  radioEmptyFallback: '暫未收錄該地區的線上電台串流，敬請期待。',
  authLoginRegister: '登入 / 註冊',
  authLogout: '登出',
  authClose: '關閉',
  authWelcome: '歡迎來到仙樂電台',
  authSubtitle: '登入後即可在留言板分享你的聽樂感悟',
  authLogin: '登入',
  authRegister: '註冊',
  authUsername: '暱稱（可選）',
  authUsernamePlaceholder: '你的暱稱',
  authEmail: '電子郵件',
  authPassword: '密碼',
  authPasswordPlaceholder: '至少 6 位',
  authBusy: '請稍候…',
  authRegisterSuccess: '註冊成功！請前往電子郵件查收確認郵件（部分郵箱可能自動登入）。',
  authLoginSuccess: '登入成功',
  authErrorFallback: '操作失敗，請重試',
  boardLabel: '寫下你的聽樂感悟',
  boardPlaceholder: '你此刻正在聽哪一國的音樂？有什麼想分享的感受？',
  boardPublishing: '發佈中…',
  boardPublish: '發佈留言',
  boardLoading: '載入留言中…',
  boardEmpty: '還沒有留言，來做第一個分享的人吧。',
  boardLoadError: '載入留言失敗',
  boardPostError: '發佈失敗，請重試',
  boardAnonymous: '匿名樂友',
  boardJustNow: '剛剛',
  boardMinutesAgo: '分鐘前',
  boardHoursAgo: '小時前',
  visitorLabel: '訪客',
  visitorTitle: '累計訪客',
};

const en: Translation = {
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
  footerAboutLine: 'Across time zones and languages, gathering the world\'s finest radio stations one by one — @Jeff 2026.09',
  footerExplore: 'Journey',
  footerBrowse: 'Browse by continent',
  footerIndex: 'Radio index',
  footerHome: 'Back to home',
  footerRadioNote: 'Stream URLs come from public internet databases; all rights belong to the stations.',
  footerIncluded: 'Catalogued',
  footerStats: 'countries and regions, with',
  footerStats2: 'music stations you can listen to online.',
  regionUnit: 'countries/regions',
  subregionUnit: 'countries',
  subdivisionUnit: 'subregions',
  listenRadio: 'Listen →',
  histSection: 'History & Culture',
  musicSection: 'Music History',
  musiciansSection: 'Musicians & Major Works',
  radiosSection: 'Major Radio Stations',
  radioIntroKicker: 'Station Notes',
  radioNoStreamNote: 'The stations below are not yet available as playable online streams and are listed for reference only.',
  radioNoStreamTag: 'No online stream',
  capitalLabel: 'Capital',
  wikiTitle: 'Wikipedia',
  radioEmptyFallback: 'No online streams are available for this region yet. Stay tuned.',
  authLoginRegister: 'Log in / Sign up',
  authLogout: 'Log out',
  authClose: 'Close',
  authWelcome: 'Welcome to World Music Radio',
  authSubtitle: 'Log in to share your listening reflections on the guestbook',
  authLogin: 'Log in',
  authRegister: 'Sign up',
  authUsername: 'Nickname (optional)',
  authUsernamePlaceholder: 'Your nickname',
  authEmail: 'Email',
  authPassword: 'Password',
  authPasswordPlaceholder: 'At least 6 characters',
  authBusy: 'Please wait…',
  authRegisterSuccess: 'Registered! Please check your email for the confirmation link (some mailboxes may log you in automatically).',
  authLoginSuccess: 'Logged in successfully',
  authErrorFallback: 'Something went wrong. Please try again.',
  boardLabel: 'Share your listening reflections',
  boardPlaceholder: 'Which country\'s music are you listening to right now? What would you like to share?',
  boardPublishing: 'Posting…',
  boardPublish: 'Post message',
  boardLoading: 'Loading messages…',
  boardEmpty: 'No messages yet — be the first to share.',
  boardLoadError: 'Failed to load messages',
  boardPostError: 'Failed to post. Please try again.',
  boardAnonymous: 'Anonymous listener',
  boardJustNow: 'just now',
  boardMinutesAgo: 'min ago',
  boardHoursAgo: 'h ago',
  visitorLabel: 'Visitors',
  visitorTitle: 'Total visitors',
};

const cy: Translation = {
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
  footerAboutLine: 'Ar draws parthau amser ac ieithoedd, gan gasglu gorsafoedd radio gorau\'r byd fesul un — @Jeff 2026.09',
  footerExplore: 'Taith',
  footerBrowse: 'Pori yn ôl cyfandir',
  footerIndex: 'Mynegai radio',
  footerHome: 'Yn ôl i\'r hafan',
  footerRadioNote: 'Daw URLau\'r ffrydiau o gronfeydd data cyhoeddus ar y rhyngrwyd; mae\'r holl hawliau\'n perthyn i\'r gorsafoedd.',
  footerIncluded: 'Wedi\'u catalogio',
  footerStats: 'o wledydd a rhanbarthau, gyda',
  footerStats2: 'o orsafoedd cerddoriaeth i wrando arnynt ar-lein.',
  regionUnit: 'gwledydd/rhanbarthau',
  subregionUnit: 'gwledydd',
  subdivisionUnit: 'isranbarth',
  listenRadio: 'Gwrando →',
  histSection: 'Hanes a Diwylliant',
  musicSection: 'Hanes Cerddoriaeth',
  musiciansSection: 'Cerddorion a Phrif Weithiau',
  radiosSection: 'Prif Orsafoedd Radio',
  radioIntroKicker: 'Nodiadau\'r Gorsafoedd',
  radioNoStreamNote: 'Nid yw\'r gorsafoedd isod ar gael eto fel ffrydiau ar-lein; rhestrir hwy er gwybodaeth yn unig.',
  radioNoStreamTag: 'Dim ffrwd ar-lein',
  capitalLabel: 'Prifddinas',
  wikiTitle: 'Wicipedia',
  radioEmptyFallback: 'Nid oes ffrydiau ar-lein ar gael eto ar gyfer y rhanbarth hwn. Arhoswch am ragor.',
  authLoginRegister: 'Mewngofnodi / Cofrestru',
  authLogout: 'Allgofnodi',
  authClose: 'Cau',
  authWelcome: 'Croeso i World Music Radio',
  authSubtitle: 'Mewngofnodwch i rannu eich myfyrdodau gwrando ar y llyfr ymwelwyr',
  authLogin: 'Mewngofnodi',
  authRegister: 'Cofrestru',
  authUsername: 'Llysenw (dewisol)',
  authUsernamePlaceholder: 'Eich llysenw',
  authEmail: 'E-bost',
  authPassword: 'Cyfrinair',
  authPasswordPlaceholder: 'O leiaf 6 nod',
  authBusy: 'Arhoswch…',
  authRegisterSuccess: 'Wedi cofrestru! Gwiriwch eich e-bost am y ddolen gadarnhau (gall rhai blwch post eich mewngofnodi\'n awtomatig).',
  authLoginSuccess: 'Wedi mewngofnodi\'n llwyddiannus',
  authErrorFallback: 'Aeth rhywbeth o\'i le. Rhowch gynnig arall arni.',
  boardLabel: 'Rhannwch eich myfyrdodau gwrando',
  boardPlaceholder: 'Pa gerddoriaeth gwlad ydych chi\'n gwrando arni ar hyn o bryd? Beth hoffech chi ei rannu?',
  boardPublishing: 'Yn postio…',
  boardPublish: 'Postio neges',
  boardLoading: 'Yn llwytho negeseuon…',
  boardEmpty: 'Dim negeseuon eto — byddwch y cyntaf i rannu.',
  boardLoadError: 'Methwyd llwytho\'r negeseuon',
  boardPostError: 'Methwyd postio. Rhowch gynnig arall arni.',
  boardAnonymous: 'Gwrandäwr anhysbys',
  boardJustNow: 'newydd',
  boardMinutesAgo: 'munud yn ôl',
  boardHoursAgo: 'awr yn ôl',
  visitorLabel: 'Ymwelwyr',
  visitorTitle: 'Cyfanswm ymwelwyr',
};

const fr: Translation = {
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
  footerAboutLine: 'À travers les fuseaux horaires et les langues, rassembler une à une les plus belles radios du monde — @Jeff 2026.09',
  footerExplore: 'Voyage',
  footerBrowse: 'Parcourir par continent',
  footerIndex: 'Index des radios',
  footerHome: 'Retour à l\'accueil',
  footerRadioNote: 'Les flux proviennent de bases de données publiques sur Internet ; tous les droits appartiennent aux stations.',
  footerIncluded: 'Répertorié',
  footerStats: 'pays et régions, avec',
  footerStats2: 'stations musicales à écouter en ligne.',
  regionUnit: 'pays/régions',
  subregionUnit: 'pays',
  subdivisionUnit: 'sous-régions',
  listenRadio: 'Écouter →',
  histSection: 'Histoire et culture',
  musicSection: 'Histoire de la musique',
  musiciansSection: 'Musiciens et œuvres majeures',
  radiosSection: 'Principales stations de radio',
  radioIntroKicker: 'Notes sur les stations',
  radioNoStreamNote: 'Les stations ci-dessous ne sont pas encore disponibles en flux en ligne écoutables ; elles sont listées à titre indicatif.',
  radioNoStreamTag: 'Aucun flux en ligne',
  capitalLabel: 'Capitale',
  wikiTitle: 'Wikipédia',
  radioEmptyFallback: 'Aucun flux en ligne n\'est encore disponible pour cette région. À bientôt.',
  authLoginRegister: 'Connexion / Inscription',
  authLogout: 'Se déconnecter',
  authClose: 'Fermer',
  authWelcome: 'Bienvenue sur World Music Radio',
  authSubtitle: 'Connectez-vous pour partager vos impressions d\'écoute sur le livre d\'or',
  authLogin: 'Se connecter',
  authRegister: 'S\'inscrire',
  authUsername: 'Pseudo (facultatif)',
  authUsernamePlaceholder: 'Votre pseudo',
  authEmail: 'E-mail',
  authPassword: 'Mot de passe',
  authPasswordPlaceholder: 'Au moins 6 caractères',
  authBusy: 'Veuillez patienter…',
  authRegisterSuccess: 'Inscription réussie ! Veuillez vérifier votre e-mail pour le lien de confirmation (certaines boîtes mail peuvent vous connecter automatiquement).',
  authLoginSuccess: 'Connexion réussie',
  authErrorFallback: 'Une erreur est survenue. Veuillez réessayer.',
  boardLabel: 'Partagez vos impressions d\'écoute',
  boardPlaceholder: 'Quelle musique de quel pays écoutez-vous en ce moment ? Que souhaitez-vous partager ?',
  boardPublishing: 'Publication…',
  boardPublish: 'Publier le message',
  boardLoading: 'Chargement des messages…',
  boardEmpty: 'Aucun message pour l\'instant — soyez le premier à partager.',
  boardLoadError: 'Échec du chargement des messages',
  boardPostError: 'Échec de la publication. Veuillez réessayer.',
  boardAnonymous: 'Auditeur anonyme',
  boardJustNow: 'à l\'instant',
  boardMinutesAgo: 'min',
  boardHoursAgo: 'h',
  visitorLabel: 'Visiteurs',
  visitorTitle: 'Visiteurs au total',
};

const de: Translation = {
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
  footerAboutLine: 'Über Zeitzonen und Sprachen hinweg, die schönsten Radiosender der Welt einen nach dem anderen zusammentragen — @Jeff 2026.09',
  footerExplore: 'Reise',
  footerBrowse: 'Nach Kontinent durchsuchen',
  footerIndex: 'Radio-Index',
  footerHome: 'Zurück zur Startseite',
  footerRadioNote: 'Stream-URLs stammen aus öffentlichen Internet-Datenbanken; alle Rechte liegen bei den Sendern.',
  footerIncluded: 'Erfasst',
  footerStats: 'Länder und Regionen mit',
  footerStats2: 'online hörbaren Musiksendern.',
  regionUnit: 'Länder/Regionen',
  subregionUnit: 'Länder',
  subdivisionUnit: 'Subregionen',
  listenRadio: 'Hören →',
  histSection: 'Geschichte & Kultur',
  musicSection: 'Musikgeschichte',
  musiciansSection: 'Musiker & Hauptwerke',
  radiosSection: 'Wichtige Radiosender',
  radioIntroKicker: 'Sendernotizen',
  radioNoStreamNote: 'Die folgenden Sender sind noch nicht als abspielbare Online-Streams verfügbar und dienen nur als Referenz.',
  radioNoStreamTag: 'Kein Online-Stream',
  capitalLabel: 'Hauptstadt',
  wikiTitle: 'Wikipedia',
  radioEmptyFallback: 'Für diese Region sind noch keine Online-Streams verfügbar. Bleiben Sie dran.',
  authLoginRegister: 'Anmelden / Registrieren',
  authLogout: 'Abmelden',
  authClose: 'Schließen',
  authWelcome: 'Willkommen bei World Music Radio',
  authSubtitle: 'Melden Sie sich an, um Ihre Höreindrücke im Gästebuch zu teilen',
  authLogin: 'Anmelden',
  authRegister: 'Registrieren',
  authUsername: 'Spitzname (optional)',
  authUsernamePlaceholder: 'Ihr Spitzname',
  authEmail: 'E-Mail',
  authPassword: 'Passwort',
  authPasswordPlaceholder: 'Mindestens 6 Zeichen',
  authBusy: 'Bitte warten…',
  authRegisterSuccess: 'Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mail für den Bestätigungslink (einige Postfächer melden Sie automatisch an).',
  authLoginSuccess: 'Erfolgreich angemeldet',
  authErrorFallback: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
  boardLabel: 'Teilen Sie Ihre Höreindrücke',
  boardPlaceholder: 'Welche Musik aus welchem Land hören Sie gerade? Was möchten Sie teilen?',
  boardPublishing: 'Wird veröffentlicht…',
  boardPublish: 'Nachricht veröffentlichen',
  boardLoading: 'Nachrichten werden geladen…',
  boardEmpty: 'Noch keine Nachrichten — seien Sie der Erste, der etwas teilt.',
  boardLoadError: 'Nachrichten konnten nicht geladen werden',
  boardPostError: 'Veröffentlichung fehlgeschlagen. Bitte versuchen Sie es erneut.',
  boardAnonymous: 'Anonymer Hörer',
  boardJustNow: 'gerade eben',
  boardMinutesAgo: 'Min.',
  boardHoursAgo: 'Std.',
  visitorLabel: 'Besucher',
  visitorTitle: 'Besucher insgesamt',
};

const it: Translation = {
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
  footerAboutLine: 'Attraverso i fusi orari e le lingue, raccogliere una a una le migliori radio del mondo — @Jeff 2026.09',
  footerExplore: 'Viaggio',
  footerBrowse: 'Sfoglia per continente',
  footerIndex: 'Indice delle radio',
  footerHome: 'Torna alla home',
  footerRadioNote: 'Gli URL dei flussi provengono da database pubblici su Internet; tutti i diritti appartengono alle emittenti.',
  footerIncluded: 'Catalogati',
  footerStats: 'paesi e regioni, con',
  footerStats2: 'stazioni musicali ascoltabili online.',
  regionUnit: 'paesi/regioni',
  subregionUnit: 'paesi',
  subdivisionUnit: 'sottoregioni',
  listenRadio: 'Ascolta →',
  histSection: 'Storia e cultura',
  musicSection: 'Storia della musica',
  musiciansSection: 'Musicisti e opere principali',
  radiosSection: 'Principali stazioni radio',
  radioIntroKicker: 'Note sulle stazioni',
  radioNoStreamNote: 'Le stazioni seguenti non sono ancora disponibili come flussi online ascoltabili e sono elencate solo come riferimento.',
  radioNoStreamTag: 'Nessun flusso online',
  capitalLabel: 'Capitale',
  wikiTitle: 'Wikipedia',
  radioEmptyFallback: 'Non sono ancora disponibili flussi online per questa regione. A presto.',
  authLoginRegister: 'Accedi / Registrati',
  authLogout: 'Esci',
  authClose: 'Chiudi',
  authWelcome: 'Benvenuto su World Music Radio',
  authSubtitle: 'Accedi per condividere le tue riflessioni d\'ascolto sul libro degli ospiti',
  authLogin: 'Accedi',
  authRegister: 'Registrati',
  authUsername: 'Soprannome (facoltativo)',
  authUsernamePlaceholder: 'Il tuo soprannome',
  authEmail: 'Email',
  authPassword: 'Password',
  authPasswordPlaceholder: 'Almeno 6 caratteri',
  authBusy: 'Attendere…',
  authRegisterSuccess: 'Registrazione riuscita! Controlla la tua email per il link di conferma (alcune caselle potrebbero accederti automaticamente).',
  authLoginSuccess: 'Accesso riuscito',
  authErrorFallback: 'Qualcosa è andato storto. Riprova.',
  boardLabel: 'Condividi le tue riflessioni d\'ascolto',
  boardPlaceholder: 'Quale musica di quale paese stai ascoltando adesso? Cosa vorresti condividere?',
  boardPublishing: 'Pubblicazione…',
  boardPublish: 'Pubblica messaggio',
  boardLoading: 'Caricamento messaggi…',
  boardEmpty: 'Ancora nessun messaggio — sii il primo a condividere.',
  boardLoadError: 'Impossibile caricare i messaggi',
  boardPostError: 'Pubblicazione non riuscita. Riprova.',
  boardAnonymous: 'Ascoltatore anonimo',
  boardJustNow: 'adesso',
  boardMinutesAgo: 'min fa',
  boardHoursAgo: 'h fa',
  visitorLabel: 'Visitatori',
  visitorTitle: 'Visitatori totali',
};

const es: Translation = {
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
  footerAboutLine: 'A través de husos horarios e idiomas, reuniendo una a una las mejores emisoras del mundo — @Jeff 2026.09',
  footerExplore: 'Viaje',
  footerBrowse: 'Explorar por continente',
  footerIndex: 'Índice de emisoras',
  footerHome: 'Volver al inicio',
  footerRadioNote: 'Las URL de los flujos provienen de bases de datos públicas de Internet; todos los derechos pertenecen a las emisoras.',
  footerIncluded: 'Catalogado',
  footerStats: 'países y regiones, con',
  footerStats2: 'emisoras musicales para escuchar en línea.',
  regionUnit: 'países/regiones',
  subregionUnit: 'países',
  subdivisionUnit: 'subregiones',
  listenRadio: 'Escuchar →',
  histSection: 'Historia y cultura',
  musicSection: 'Historia de la música',
  musiciansSection: 'Músicos y obras principales',
  radiosSection: 'Principales emisoras de radio',
  radioIntroKicker: 'Notas de las emisoras',
  radioNoStreamNote: 'Las siguientes emisoras aún no están disponibles como flujos en línea reproducibles y se enumeran solo como referencia.',
  radioNoStreamTag: 'Sin flujo en línea',
  capitalLabel: 'Capital',
  wikiTitle: 'Wikipedia',
  radioEmptyFallback: 'Aún no hay flujos en línea disponibles para esta región. Próximamente.',
  authLoginRegister: 'Iniciar sesión / Registrarse',
  authLogout: 'Cerrar sesión',
  authClose: 'Cerrar',
  authWelcome: 'Bienvenido a World Music Radio',
  authSubtitle: 'Inicia sesión para compartir tus reflexiones de escucha en el libro de visitas',
  authLogin: 'Iniciar sesión',
  authRegister: 'Registrarse',
  authUsername: 'Apodo (opcional)',
  authUsernamePlaceholder: 'Tu apodo',
  authEmail: 'Correo electrónico',
  authPassword: 'Contraseña',
  authPasswordPlaceholder: 'Al menos 6 caracteres',
  authBusy: 'Espere…',
  authRegisterSuccess: '¡Registro completado! Revisa tu correo para el enlace de confirmación (algunos buzones pueden iniciar sesión automáticamente).',
  authLoginSuccess: 'Sesión iniciada correctamente',
  authErrorFallback: 'Algo salió mal. Inténtalo de nuevo.',
  boardLabel: 'Comparte tus reflexiones de escucha',
  boardPlaceholder: '¿Qué música de qué país estás escuchando ahora? ¿Qué te gustaría compartir?',
  boardPublishing: 'Publicando…',
  boardPublish: 'Publicar mensaje',
  boardLoading: 'Cargando mensajes…',
  boardEmpty: 'Aún no hay mensajes — sé el primero en compartir.',
  boardLoadError: 'No se pudieron cargar los mensajes',
  boardPostError: 'No se pudo publicar. Inténtalo de nuevo.',
  boardAnonymous: 'Oyente anónimo',
  boardJustNow: 'ahora mismo',
  boardMinutesAgo: 'min',
  boardHoursAgo: 'h',
  visitorLabel: 'Visitantes',
  visitorTitle: 'Visitantes totales',
};

export const TRANSLATIONS: Record<Lang, Translation> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  cy,
  fr,
  de,
  it,
  es,
};

// 大洲名（按大洲 id 索引）
export const CONTINENT_LABELS: Record<Lang, Record<ContinentId, string>> = {
  'zh-CN': { europe: '欧洲', asia: '亚洲', africa: '非洲', 'north-america': '北美洲', 'south-america': '南美洲', oceania: '大洋洲' },
  'zh-TW': { europe: '歐洲', asia: '亞洲', africa: '非洲', 'north-america': '北美洲', 'south-america': '南美洲', oceania: '大洋洲' },
  en: { europe: 'Europe', asia: 'Asia', africa: 'Africa', 'north-america': 'North America', 'south-america': 'South America', oceania: 'Oceania' },
  cy: { europe: 'Ewrop', asia: 'Asia', africa: 'Affrica', 'north-america': 'Gogledd America', 'south-america': 'De America', oceania: 'Oceania' },
  fr: { europe: 'Europe', asia: 'Asie', africa: 'Afrique', 'north-america': 'Amérique du Nord', 'south-america': 'Amérique du Sud', oceania: 'Océanie' },
  de: { europe: 'Europa', asia: 'Asien', africa: 'Afrika', 'north-america': 'Nordamerika', 'south-america': 'Südamerika', oceania: 'Ozeanien' },
  it: { europe: 'Europa', asia: 'Asia', africa: 'Africa', 'north-america': 'America del Nord', 'south-america': 'America del Sud', oceania: 'Oceania' },
  es: { europe: 'Europa', asia: 'Asia', africa: 'África', 'north-america': 'América del Norte', 'south-america': 'América del Sur', oceania: 'Oceanía' },
};

// 子区域名（按子区域 id 索引）
export const SUBREGION_LABELS: Record<Lang, Record<SubregionId, string>> = {
  'zh-CN': {
    'western-europe': '西欧', 'southern-europe': '南欧', 'northern-europe': '北欧', 'central-europe': '中欧', 'eastern-europe': '东欧',
    'east-asia': '东亚', 'west-asia': '西亚', 'south-asia': '南亚', 'southeast-asia': '东南亚', 'central-asia': '中亚',
    'north-africa': '北非', 'west-africa': '西非', 'east-africa': '东非', 'central-africa': '中非', 'southern-africa': '南部非洲',
    'northern-america': '北美', 'central-america': '中美', caribbean: '加勒比',
    'south-america': '南美',
    australasia: '澳大拉西亚', melanesia: '美拉尼西亚', micronesia: '密克罗尼西亚', polynesia: '波利尼西亚',
  },
  'zh-TW': {
    'western-europe': '西歐', 'southern-europe': '南歐', 'northern-europe': '北歐', 'central-europe': '中歐', 'eastern-europe': '東歐',
    'east-asia': '東亞', 'west-asia': '西亞', 'south-asia': '南亞', 'southeast-asia': '東南亞', 'central-asia': '中亞',
    'north-africa': '北非', 'west-africa': '西非', 'east-africa': '東非', 'central-africa': '中非', 'southern-africa': '南部非洲',
    'northern-america': '北美', 'central-america': '中美', caribbean: '加勒比',
    'south-america': '南美',
    australasia: '澳大拉西亞', melanesia: '美拉尼西亞', micronesia: '密克羅尼西亞', polynesia: '波利尼西亞',
  },
  en: {
    'western-europe': 'Western Europe', 'southern-europe': 'Southern Europe', 'northern-europe': 'Northern Europe', 'central-europe': 'Central Europe', 'eastern-europe': 'Eastern Europe',
    'east-asia': 'East Asia', 'west-asia': 'West Asia', 'south-asia': 'South Asia', 'southeast-asia': 'Southeast Asia', 'central-asia': 'Central Asia',
    'north-africa': 'North Africa', 'west-africa': 'West Africa', 'east-africa': 'East Africa', 'central-africa': 'Central Africa', 'southern-africa': 'Southern Africa',
    'northern-america': 'Northern America', 'central-america': 'Central America', caribbean: 'Caribbean',
    'south-america': 'South America',
    australasia: 'Australasia', melanesia: 'Melanesia', micronesia: 'Micronesia', polynesia: 'Polynesia',
  },
  cy: {
    'western-europe': 'Gorllewin Ewrop', 'southern-europe': 'De Ewrop', 'northern-europe': 'Gogledd Ewrop', 'central-europe': 'Canolbarth Ewrop', 'eastern-europe': 'Dwyrain Ewrop',
    'east-asia': 'Dwyrain Asia', 'west-asia': 'Gorllewin Asia', 'south-asia': 'De Asia', 'southeast-asia': 'De-ddwyrain Asia', 'central-asia': 'Canolbarth Asia',
    'north-africa': 'Gogledd Affrica', 'west-africa': 'Gorllewin Affrica', 'east-africa': 'Dwyrain Affrica', 'central-africa': 'Canolbarth Affrica', 'southern-africa': 'De Affrica',
    'northern-america': 'Gogledd America', 'central-america': 'Canolbarth America', caribbean: 'y Caribî',
    'south-america': 'De America',
    australasia: 'Awstralasia', melanesia: 'Melanesia', micronesia: 'Micronesia', polynesia: 'Polynesia',
  },
  fr: {
    'western-europe': 'Europe de l\'Ouest', 'southern-europe': 'Europe du Sud', 'northern-europe': 'Europe du Nord', 'central-europe': 'Europe centrale', 'eastern-europe': 'Europe de l\'Est',
    'east-asia': 'Asie de l\'Est', 'west-asia': 'Asie de l\'Ouest', 'south-asia': 'Asie du Sud', 'southeast-asia': 'Asie du Sud-Est', 'central-asia': 'Asie centrale',
    'north-africa': 'Afrique du Nord', 'west-africa': 'Afrique de l\'Ouest', 'east-africa': 'Afrique de l\'Est', 'central-africa': 'Afrique centrale', 'southern-africa': 'Afrique australe',
    'northern-america': 'Amérique septentrionale', 'central-america': 'Amérique centrale', caribbean: 'Caraïbes',
    'south-america': 'Amérique du Sud',
    australasia: 'Australasie', melanesia: 'Mélanésie', micronesia: 'Micronésie', polynesia: 'Polynésie',
  },
  de: {
    'western-europe': 'Westeuropa', 'southern-europe': 'Südeuropa', 'northern-europe': 'Nordeuropa', 'central-europe': 'Mitteleuropa', 'eastern-europe': 'Osteuropa',
    'east-asia': 'Ostasien', 'west-asia': 'Westasien', 'south-asia': 'Südasien', 'southeast-asia': 'Südostasien', 'central-asia': 'Zentralasien',
    'north-africa': 'Nordafrika', 'west-africa': 'Westafrika', 'east-africa': 'Ostafrika', 'central-africa': 'Zentralafrika', 'southern-africa': 'Südliches Afrika',
    'northern-america': 'Nördliches Amerika', 'central-america': 'Mittelamerika', caribbean: 'Karibik',
    'south-america': 'Südamerika',
    australasia: 'Australasien', melanesia: 'Melanesien', micronesia: 'Mikronesien', polynesia: 'Polynesien',
  },
  it: {
    'western-europe': 'Europa occidentale', 'southern-europe': 'Europa meridionale', 'northern-europe': 'Europa settentrionale', 'central-europe': 'Europa centrale', 'eastern-europe': 'Europa orientale',
    'east-asia': 'Asia orientale', 'west-asia': 'Asia occidentale', 'south-asia': 'Asia meridionale', 'southeast-asia': 'Sud-est asiatico', 'central-asia': 'Asia centrale',
    'north-africa': 'Nordafrica', 'west-africa': 'Africa occidentale', 'east-africa': 'Africa orientale', 'central-africa': 'Africa centrale', 'southern-africa': 'Africa meridionale',
    'northern-america': 'America settentrionale', 'central-america': 'America centrale', caribbean: 'Caraibi',
    'south-america': 'Sud America',
    australasia: 'Australasia', melanesia: 'Melanesia', micronesia: 'Micronesia', polynesia: 'Polinesia',
  },
  es: {
    'western-europe': 'Europa Occidental', 'southern-europe': 'Europa Meridional', 'northern-europe': 'Europa del Norte', 'central-europe': 'Europa Central', 'eastern-europe': 'Europa Oriental',
    'east-asia': 'Asia Oriental', 'west-asia': 'Asia Occidental', 'south-asia': 'Asia Meridional', 'southeast-asia': 'Sudeste Asiático', 'central-asia': 'Asia Central',
    'north-africa': 'África del Norte', 'west-africa': 'África Occidental', 'east-africa': 'África Oriental', 'central-africa': 'África Central', 'southern-africa': 'África Austral',
    'northern-america': 'América Septentrional', 'central-america': 'América Central', caribbean: 'Caribe',
    'south-america': 'América del Sur',
    australasia: 'Australasia', melanesia: 'Melanesia', micronesia: 'Micronesia', polynesia: 'Polinesia',
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

// 语言切换事件名：LanguageSwitcher 切换后派发，供 React 岛组件同步更新文案
export const LANG_CHANGE_EVENT = 'mr:lang-changed';

/** 读取当前生效语言：优先 DOM 上的 lang 属性，其次 localStorage，最后默认 zh-CN */
export function getCurrentLang(): Lang {
  if (typeof document !== 'undefined') {
    const dom = document.documentElement.getAttribute('lang') as Lang | null;
    if (dom && dom in TRANSLATIONS) return dom;
  }
  return getInitialLang();
}

/** 取某语言文案（缺失时回退 zh-CN） */
export function getTranslation(lang: Lang): Translation {
  return TRANSLATIONS[lang] || TRANSLATIONS['zh-CN'];
}
