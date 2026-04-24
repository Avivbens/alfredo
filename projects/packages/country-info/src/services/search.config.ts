import type { FuseOptionKey } from 'fuse.js';
import type { Country } from 'world-countries';

export const SEARCH_COUNTRY_FIELDS_CONFIG: FuseOptionKey<Country>[] = [
  { name: 'cca2', weight: 4 },
  { name: 'cca3', weight: 4 },
  { name: 'cioc', weight: 3 },
  { name: 'name.common', weight: 2 },
  { name: 'name.official', weight: 1 },
  { name: 'altSpellings', weight: 1 },
];
