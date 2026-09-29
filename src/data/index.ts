import { europe1 } from './regions/europe1';
import { europe2 } from './regions/europe2';
import { asia } from './regions/asia';
import { americas } from './regions/americas';
import { oceania } from './regions/oceania';
import { africa } from './regions/africa';
import type { Country, ContinentId, SubregionId } from '../lib/country';
import { CONTINENTS, SUBREGIONS } from '../lib/country';

export const allCountries: Country[] = [
  ...europe1,
  ...europe2,
  ...asia,
  ...americas,
  ...oceania,
  ...africa,
];

export function countriesByContinent(continent: ContinentId): Country[] {
  return allCountries.filter((c) => c.continent === continent);
}

export function countriesBySubregion(subregion: SubregionId): Country[] {
  return allCountries.filter((c) => c.subregion === subregion);
}

export function getCountry(slug: string): Country | undefined {
  return allCountries.find((c) => c.slug === slug);
}

export function getContinentCounts(): { continent: ContinentId; count: number }[] {
  return CONTINENTS.map((c) => ({
    continent: c.id,
    count: allCountries.filter((x) => x.continent === c.id).length,
  }));
}

export function getSubregionCounts(): { subregion: SubregionId; count: number }[] {
  return SUBREGIONS.map((s) => ({
    subregion: s.id,
    count: allCountries.filter((x) => x.subregion === s.id).length,
  }));
}

export const totalCountries = allCountries.length;
