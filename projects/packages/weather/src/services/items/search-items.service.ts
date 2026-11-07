import type { AlfredListItem } from 'fast-alfred';
import { toErrorMessage } from '../../common/error.util';
import { MIN_SEARCH_LENGTH } from '../../config/constants';
import type { GeocodingResult } from '../../models/open-meteo.schema';
import type { AppRouter } from '../../models/routes.model';
import { searchCities } from '../open-meteo/geocoding.service';
import type { Cache } from '../system/cache.service';
import { type Icons, toIssueItem } from './issue-items.service';
import type { SearchRows } from './search-items.model';

/** The country goes into the label, so a found city never shares its route with a saved place of the same name */
function toSearchItem(
  { name, admin1, country, latitude, longitude }: GeocodingResult,
  router: AppRouter,
): AlfredListItem {
  const region = [admin1, country].filter(Boolean).join(', ');
  const label = country ? `${name}, ${country}` : name;

  return router.link('days', {
    label,
    state: { name: label, latitude, longitude },
    title: region ? `${name} · ${region}` : name,
    subtitle: '↩ to see the forecast',
  });
}

export async function loadSearchRows(
  cache: Cache,
  query: string,
  router: AppRouter,
  icons: Icons,
  now: number,
): Promise<SearchRows> {
  if (query.trim().length < MIN_SEARCH_LENGTH) {
    return { items: [], failed: false };
  }

  try {
    const results = await searchCities(cache, query, now);
    return { items: results.map((result) => toSearchItem(result, router)), failed: false };
  } catch (error) {
    return { items: [toIssueItem({ kind: 'search-failed', message: toErrorMessage(error) }, icons)], failed: true };
  }
}
