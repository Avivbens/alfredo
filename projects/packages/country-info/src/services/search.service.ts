import Fuse from 'fuse.js';
import type { Country } from 'world-countries';
import countries from 'world-countries';
import { SEARCH_COUNTRY_FIELDS_CONFIG } from './search.config';

type CountryWithCallingCodes = Country & { callingCodes: string[] };

function getCallingCodes({ idd }: Country): string[] {
  const root = idd?.root ?? '';
  if (!root) {
    return [];
  }

  const suffixes = idd.suffixes ?? [];
  if (suffixes.length === 0) {
    return [root];
  }

  return suffixes.map((suffix) => `${root}${suffix}`);
}

const countriesWithCallingCodes: CountryWithCallingCodes[] = countries.map((country) => ({
  ...country,
  callingCodes: getCallingCodes(country),
}));

export async function searchCountries(searchTerm: string, limit: number, threshold: number): Promise<Country[]> {
  const trimmed = searchTerm?.trim() ?? '';

  if (!trimmed) {
    return countries.slice(0, limit);
  }

  if (trimmed.startsWith('+')) {
    return searchByCallingCode(trimmed, limit, threshold);
  }

  const fuse = new Fuse(countries, {
    keys: SEARCH_COUNTRY_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    threshold,
  });

  const res = fuse.search(trimmed, { limit });
  return res.map((match) => match.item);
}

/**
 * Fuzzy-match calling codes with tighter Fuse options than the name search:
 * numeric codes have no semantic "typos" worth accepting loosely, and with
 * the default threshold the US's many NANP suffixes fuzzy-match nearly every
 * query — ranking US above UK for `+44`, above France for `+33`, etc.
 *
 * - `threshold / 2`: halve the user's tolerance for this path.
 * - `distance: 0`: anchor matches at position 0 (prefix behavior).
 * - `minMatchCharLength: input.length`: require the whole query to match.
 */
function searchByCallingCode(input: string, limit: number, threshold: number): Country[] {
  const fuse = new Fuse(countriesWithCallingCodes, {
    keys: ['callingCodes'],
    isCaseSensitive: false,
    shouldSort: true,
    threshold: threshold / 2,
    distance: 0,
    minMatchCharLength: input.length,
  });

  const res = fuse.search(input, { limit });
  return res.map((match) => match.item);
}
