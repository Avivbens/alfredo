import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEOCODE_TTL } from '../../config/constants';
import { toMapCache } from '../system/cache.mock';
import { geocodeSavedName, searchPlaces } from './geocoding.service';

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
