import en from './en.json';
import cy from './cy.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';
import es from './es.json';
import zhTW from './zh-TW.json';
import type { Lang } from '../../lib/i18n';
import type { CountryContent } from '../../lib/i18n-content';
import { allCountries } from '../index';

const CONTENT: Record<string, Record<string, CountryContent>> = {
  en,
  cy,
  fr,
  de,
  it,
  es,
  'zh-TW': zhTW,
};

/** 取某国某语言的正文翻译；缺失则返回 undefined（页面回退到中文原文） */
export function getCountryContent(slug: string, lang: Lang): CountryContent | undefined {
  return CONTENT[lang]?.[slug];
}

/** 取某国全部语言的正文翻译（用于内嵌到页面） */
export function getCountryAllLangs(slug: string): Record<string, CountryContent> {
  const out: Record<string, CountryContent> = {};
  for (const lang of Object.keys(CONTENT)) {
    const c = CONTENT[lang]?.[slug];
    if (c) out[lang] = c;
  }
  return out;
}

export interface CompactContent {
  name: string;
  intro: string;
}

/** 首页国家卡片所需精简多语言内容：{ lang: { slug: { name, intro } } }（含 zh-CN 原文） */
export function getAllCompact(): Record<string, Record<string, CompactContent>> {
  const out: Record<string, Record<string, CompactContent>> = { 'zh-CN': {} };
  for (const c of allCountries) out['zh-CN'][c.slug] = { name: c.name, intro: c.intro };
  for (const lang of Object.keys(CONTENT)) {
    const map: Record<string, CompactContent> = {};
    for (const c of allCountries) {
      const t = CONTENT[lang]?.[c.slug];
      if (t) map[c.slug] = { name: t.name, intro: t.intro };
    }
    out[lang] = map;
  }
  return out;
}
