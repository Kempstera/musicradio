// 国家/地区数据类型与区域元数据

export type RegionId =
  | 'europe'
  | 'east-asia'
  | 'west-asia'
  | 'south-asia'
  | 'southeast-asia'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'africa';

export interface RegionMeta {
  id: RegionId;
  label: string;
  en: string;
  note?: string;
}

export interface Musician {
  name: string;
  nameEn?: string;
  role: string;
  desc: string;
}

export interface NotableRadio {
  name: string;
  genre: string;
  note?: string;
  /** 可选：可直接播放的流地址 */
  url?: string;
  hls?: boolean;
}

export interface Country {
  slug: string;
  name: string;
  nameEn: string;
  nameLocal?: string;
  region: RegionId;
  flag: string;
  capital: string;
  languages: string[];
  iso: string;
  intro: string;
  history: string[];
  music: string[];
  musicians: Musician[];
  notableRadios?: NotableRadio[];
  /** 非洲大区等：由多国合并而成 */
  isGroup?: boolean;
  groupCountries?: string[];
  /** 若为 'notable-only'，则只展示精选电台、不展示自动采集的在线电台 */
  radioMode?: 'notable-only';
}

export const REGIONS: RegionMeta[] = [
  { id: 'europe', label: '欧洲', en: 'Europe' },
  { id: 'east-asia', label: '东亚', en: 'East Asia' },
  { id: 'west-asia', label: '西亚', en: 'West Asia' },
  { id: 'south-asia', label: '南亚', en: 'South Asia' },
  { id: 'southeast-asia', label: '东南亚', en: 'Southeast Asia' },
  { id: 'north-america', label: '北美', en: 'North America' },
  { id: 'south-america', label: '南美', en: 'South America' },
  { id: 'oceania', label: '大洋洲', en: 'Oceania' },
  { id: 'africa', label: '非洲', en: 'Africa', note: '按大区巡礼' },
];

export const REGION_MAP: Record<RegionId, RegionMeta> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
) as Record<RegionId, RegionMeta>;
