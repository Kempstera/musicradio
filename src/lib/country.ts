// 国家/地区数据类型与大洲、子区域元数据（三级分类：大洲 → 子区域 → 国别）

export type ContinentId =
  | 'europe'
  | 'asia'
  | 'africa'
  | 'north-america'
  | 'south-america'
  | 'oceania';

export type SubregionId =
  // 欧洲五分
  | 'western-europe'
  | 'southern-europe'
  | 'northern-europe'
  | 'central-europe'
  | 'eastern-europe'
  // 亚洲五分
  | 'east-asia'
  | 'west-asia'
  | 'south-asia'
  | 'southeast-asia'
  | 'central-asia'
  // 非洲五分
  | 'north-africa'
  | 'west-africa'
  | 'east-africa'
  | 'central-africa'
  | 'southern-africa'
  // 北美洲三分
  | 'northern-america'
  | 'central-america'
  | 'caribbean'
  // 南美洲
  | 'south-america'
  // 大洋洲四分
  | 'australasia'
  | 'melanesia'
  | 'micronesia'
  | 'polynesia';

export interface ContinentMeta {
  id: ContinentId;
  label: string;
  en: string;
  order: number;
}

export interface SubregionMeta {
  id: SubregionId;
  label: string;
  en: string;
  continent: ContinentId;
}

export const CONTINENTS: ContinentMeta[] = [
  { id: 'europe', label: '欧洲', en: 'Europe', order: 1 },
  { id: 'asia', label: '亚洲', en: 'Asia', order: 2 },
  { id: 'africa', label: '非洲', en: 'Africa', order: 3 },
  { id: 'north-america', label: '北美洲', en: 'North America', order: 4 },
  { id: 'south-america', label: '南美洲', en: 'South America', order: 5 },
  { id: 'oceania', label: '大洋洲', en: 'Oceania', order: 6 },
];

export const SUBREGIONS: SubregionMeta[] = [
  // 欧洲
  { id: 'western-europe', label: '西欧', en: 'Western Europe', continent: 'europe' },
  { id: 'southern-europe', label: '南欧', en: 'Southern Europe', continent: 'europe' },
  { id: 'northern-europe', label: '北欧', en: 'Northern Europe', continent: 'europe' },
  { id: 'central-europe', label: '中欧', en: 'Central Europe', continent: 'europe' },
  { id: 'eastern-europe', label: '东欧', en: 'Eastern Europe', continent: 'europe' },
  // 亚洲
  { id: 'east-asia', label: '东亚', en: 'East Asia', continent: 'asia' },
  { id: 'west-asia', label: '西亚', en: 'West Asia', continent: 'asia' },
  { id: 'south-asia', label: '南亚', en: 'South Asia', continent: 'asia' },
  { id: 'southeast-asia', label: '东南亚', en: 'Southeast Asia', continent: 'asia' },
  { id: 'central-asia', label: '中亚', en: 'Central Asia', continent: 'asia' },
  // 非洲
  { id: 'north-africa', label: '北非', en: 'North Africa', continent: 'africa' },
  { id: 'west-africa', label: '西非', en: 'West Africa', continent: 'africa' },
  { id: 'east-africa', label: '东非', en: 'East Africa', continent: 'africa' },
  { id: 'central-africa', label: '中非', en: 'Central Africa', continent: 'africa' },
  { id: 'southern-africa', label: '南部非洲', en: 'Southern Africa', continent: 'africa' },
  // 北美洲
  { id: 'northern-america', label: '北美', en: 'Northern America', continent: 'north-america' },
  { id: 'central-america', label: '中美', en: 'Central America', continent: 'north-america' },
  { id: 'caribbean', label: '加勒比', en: 'Caribbean', continent: 'north-america' },
  // 南美洲
  { id: 'south-america', label: '南美', en: 'South America', continent: 'south-america' },
  // 大洋洲
  { id: 'australasia', label: '澳大拉西亚', en: 'Australasia', continent: 'oceania' },
  { id: 'melanesia', label: '美拉尼西亚', en: 'Melanesia', continent: 'oceania' },
  { id: 'micronesia', label: '密克罗尼西亚', en: 'Micronesia', continent: 'oceania' },
  { id: 'polynesia', label: '波利尼西亚', en: 'Polynesia', continent: 'oceania' },
];

export const CONTINENT_MAP: Record<ContinentId, ContinentMeta> = Object.fromEntries(
  CONTINENTS.map((c) => [c.id, c]),
) as Record<ContinentId, ContinentMeta>;

export const SUBREGION_MAP: Record<SubregionId, SubregionMeta> = Object.fromEntries(
  SUBREGIONS.map((s) => [s.id, s]),
) as Record<SubregionId, SubregionMeta>;

export function subregionsOf(continent: ContinentId): SubregionMeta[] {
  return SUBREGIONS.filter((s) => s.continent === continent);
}

export interface Musician {
  name: string;
  nameEn?: string;
  role: string;
  desc: string;
  /** 可选：维基百科条目链接 */
  wikiUrl?: string;
}

export interface NotableRadio {
  name: string;
  genre: string;
  note?: string;
  /** 可选：可直接播放的流地址 */
  url?: string;
  hls?: boolean;
  /** 可选：电台官网 */
  homepage?: string;
}

export interface Country {
  slug: string;
  name: string;
  nameEn: string;
  nameLocal?: string;
  /** 大洲 */
  continent: ContinentId;
  /** 大洲内的子区域（二级分类） */
  subregion: SubregionId;
  flag: string;
  capital: string;
  languages: string[];
  iso: string;
  intro: string;
  history: string[];
  music: string[];
  musicians: Musician[];
  notableRadios?: NotableRadio[];
  /** 非洲大区等：由多国合并而成（逐步弃用，改为具体国别） */
  isGroup?: boolean;
  groupCountries?: string[];
  /** 若为 'notable-only'，则只展示精选电台、不展示自动采集的在线电台 */
  radioMode?: 'notable-only';
  /** 该国/地区暂无在线电台时，展示的说明（可选覆盖默认文案） */
  radioNote?: string;
}
