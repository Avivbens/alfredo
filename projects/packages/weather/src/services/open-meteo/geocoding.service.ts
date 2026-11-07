import { setTimeout } from 'node:timers/promises';
import { type Cache, loadCached } from '@alfredo/cache';
import {
  CITY_SEARCHES_CACHE_KEY,
  CITY_SEARCH_COUNT,
  CITY_SEARCH_DEBOUNCE_MS,
  CITY_SEARCH_TTL,
  GEOCODE_TTL,
  GEOCODING_URL,
} from '../../config/constants';
import { type GeocodingResult, geocodingResponseSchema } from '../../models/open-meteo.schema';
import { type Place, placeSchema } from '../../models/place.model';
import { fetchJson } from '../system/http.service';
import { type SearchMap, searchMapSchema } from './geocoding.model';

export async function searchPlaces(query: string, count: number): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({ name: query, count: String(count), language: 'en', format: 'json' });
  const body = await fetchJson(`${GEOCODING_URL}?${params}`, 'Open-Meteo');
  return geocodingResponseSchema.parse(body).results;
}

/** The saved line stays the name, since it is what the user wrote and expects to see */
export async function geocodeSavedName(cache: Cache, name: string): Promise<Place | null> {
  return loadCached<Place | null>(
    cache,
    `geocode:${name.toLowerCase()}`,
    GEOCODE_TTL,
    placeSchema,
    async () => {
      const [match] = await searchPlaces(name, 1);
      return match ? { name, latitude: match.latitude, longitude: match.longitude } : null;
    },
    (place) => place !== null,
  );
}

function getCachedSearches(cache: Cache): SearchMap {
  const stored = searchMapSchema.safeParse(cache.get<unknown>(CITY_SEARCHES_CACHE_KEY));
  return stored.success ? stored.data : {};
}

/** Every typed prefix is a query, so they share one key pruned on each write instead of piling up as keys of their own */
export async function searchCities(cache: Cache, query: string, now: number): Promise<GeocodingResult[]> {
  const name = query.trim();
  const key = name.toLowerCase();
  const stored = getCachedSearches(cache);
  const cached = stored[key];
  if (cached && now - cached.fetchedAt < CITY_SEARCH_TTL) {
    return cached.results;
  }

  await setTimeout(CITY_SEARCH_DEBOUNCE_MS);
  const results = await searchPlaces(name, CITY_SEARCH_COUNT);
  const kept = Object.entries(stored).filter(([, { fetchedAt }]) => now - fetchedAt < CITY_SEARCH_TTL);
  cache.setWithTTL(
    CITY_SEARCHES_CACHE_KEY,
    { ...Object.fromEntries(kept), [key]: { fetchedAt: now, results } },
    { maxAge: CITY_SEARCH_TTL },
  );

  return results;
}
