// 国家正文内容的多语言类型（正文 = 历史/音乐史/音乐家/电台等，区别于 UI 骨架文案）
import type { Lang } from './i18n';
import type { Country } from './country';

export interface MusicianContent {
  /** 本地化显示名（外语用 nameEn 音译名，繁中用 opencc 转换名） */
  name: string;
  role: string;
  desc: string;
}

export interface RadioContent {
  /** 电台名（专有名词，基本保留原文） */
  name: string;
  genre: string;
  note: string;
}

export interface CountryContent {
  name: string;
  intro: string;
  history: string[];
  music: string[];
  musicians: MusicianContent[];
  radios: RadioContent[];
  radioNote: string;
}

export type ContentTranslations = Partial<Record<Lang, Record<string, CountryContent>>>;

/** 把源 Country 对象转换为 zh-CN 正文结构（作为默认语言/回退） */
export function toCountryContent(c: Country): CountryContent {
  return {
    name: c.name,
    intro: c.intro,
    history: c.history || [],
    music: c.music || [],
    musicians: (c.musicians || []).map((m) => ({ name: m.name, role: m.role, desc: m.desc })),
    radios: (c.notableRadios || []).map((r) => ({ name: r.name, genre: r.genre, note: r.note || '' })),
    radioNote: c.radioNote || '',
  };
}
