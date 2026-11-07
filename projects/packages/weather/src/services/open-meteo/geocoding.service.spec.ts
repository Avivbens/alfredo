import { hoursToMilliseconds } from 'date-fns';
import { setTimeout } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CITY_SEARCHES_CACHE_KEY, CITY_SEARCH_DEBOUNCE_MS, CITY_SEARCH_TTL, GEOCODE_TTL } from '../../config/constants';
import { NOW } from '../../models/open-meteo.mock';
import { toMapCache } from '../system/cache.mock';
import { geocodeSavedName, searchCities, searchPlaces } from './geocoding.service';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

const HAIFA = { name: 'Haifa', latitude: 32.81303, longitude: 34.99928, country: 'Israel', admin1: 'Haifa District' };

function toJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('geocoding.service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => toJsonResponse({ results: [HAIFA] }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchPlaces', () => {
    it('should search by name in English', async () => {
      const results = await searchPlaces('Haifa', 5);

      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        name: 'Haifa',
        count: '5',
        language: 'en',
        format: 'json',
      });
      expect(results).toEqual([HAIFA]);
    });

    it('should return no results when the answer has none', async () => {
      fetchMock.mockImplementation(async () => toJsonResponse({}));

      await expect(searchPlaces('Nowhere', 5)).resolves.toEqual([]);
    });
  });

  describe('searchCities', () => {
    it('should wait for typing to settle, then search for five cities and cache them', async () => {
      const { cache, fake } = toMapCache();

      const results = await searchCities(cache, ' Hai ', NOW);

      expect(setTimeout).toHaveBeenCalledWith(CITY_SEARCH_DEBOUNCE_MS);
      expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('count')).toBe('5');
      expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('name')).toBe('Hai');
      expect(fake.setWithTTL).toHaveBeenCalledWith(
        CITY_SEARCHES_CACHE_KEY,
        { hai: { fetchedAt: NOW, results } },
        { maxAge: CITY_SEARCH_TTL },
      );
    });

    it('should answer a repeated search from the cache without waiting', async () => {
      const { cache } = toMapCache({
        [CITY_SEARCHES_CACHE_KEY]: { hai: { fetchedAt: NOW - hoursToMilliseconds(1), results: [HAIFA] } },
      });

      await expect(searchCities(cache, 'hai', NOW)).resolves.toEqual([HAIFA]);
      expect(setTimeout).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should keep every search under one key and drop those older than a day', async () => {
      const recent = { fetchedAt: NOW - hoursToMilliseconds(2), results: [] };
      const { cache, store } = toMapCache({
        [CITY_SEARCHES_CACHE_KEY]: { tel: recent, par: { fetchedAt: NOW - hoursToMilliseconds(25), results: [] } },
      });

      await searchCities(cache, 'hai', NOW);

      expect([...store.keys()]).toEqual([CITY_SEARCHES_CACHE_KEY]);
      expect(store.get(CITY_SEARCHES_CACHE_KEY)).toEqual({ tel: recent, hai: { fetchedAt: NOW, results: [HAIFA] } });
    });
  });

  describe('geocodeSavedName', () => {
    it('should keep the saved line as the name and cache the place', async () => {
      const { cache, fake } = toMapCache();

      const place = await geocodeSavedName(cache, 'Haifa');

      expect(place).toEqual({ name: 'Haifa', latitude: 32.81303, longitude: 34.99928 });
      expect(fake.setWithTTL).toHaveBeenCalledWith('geocode:haifa', place, { maxAge: GEOCODE_TTL });
    });

    it('should return null and cache nothing when the name is not found', async () => {
      fetchMock.mockImplementation(async () => toJsonResponse({}));
      const { cache, fake } = toMapCache();

      await expect(geocodeSavedName(cache, 'Nowhere')).resolves.toBeNull();
      expect(fake.setWithTTL).not.toHaveBeenCalled();
    });

    it('should use the cached place without a request', async () => {
      const cached = { name: 'Haifa', latitude: 1, longitude: 2 };
      const { cache } = toMapCache({ 'geocode:haifa': cached });

      await expect(geocodeSavedName(cache, 'Haifa')).resolves.toEqual(cached);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
