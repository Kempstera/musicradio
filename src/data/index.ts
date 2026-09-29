import { europe1 } from './regions/europe1';
import { europe2 } from './regions/europe2';
import { asia } from './regions/asia';
import { americas } from './regions/americas';
import { oceania } from './regions/oceania';
import { africa } from './regions/africa';
import type { Country, RegionId } from '../lib/country';
import { REGIONS } from '../lib/country';

export const allCountries: Country[] = [
  ...europe1,
  ...europe2,
  ...asia,
  ...americas,
  ...oceania,
  ...africa,
];

export function countriesByRegion(region: RegionId): Country[] {
  return allCountries.filter((c) => c.region === region);
}

export function getCountry(slug: string): Country | undefined {
  return allCountries.find((c) => c.slug === slug);
}

export function getRegionCounts(): { region: RegionId; count: number }[] {
  return REGIONS.map((r) => ({
    region: r.id,
    count: allCountries.filter((c) => c.region === r.id).length,
  }));
}

export const totalCountries = allCountries.length;
