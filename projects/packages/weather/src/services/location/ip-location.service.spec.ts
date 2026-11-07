import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEO_JS_URL, IP_LOCATION_TTL, IP_WHO_IS_URL } from '../../config/constants';
import { toMapCache } from '../system/cache.mock';
import { loadCurrentPlace, locateByIp } from './ip-location.service';

const IP_WHO_IS = { success: true, city: 'Tel-Aviv', latitude: 32.0809, longitude: 34.7806 };
const GEO_JS = { city: 'Rishon LeTsiyyon', latitude: '31.96', longitude: '34.80' };

function toJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('ip-location.service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let ipWhoIs: () => Promise<Response>;

  beforeEach(() => {
    ipWhoIs = async () => toJsonResponse(IP_WHO_IS);
    fetchMock.mockImplementation(async (input) =>
      String(input) === IP_WHO_IS_URL ? ipWhoIs() : toJsonResponse(GEO_JS),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('locateByIp', () => {
    it('should use ipwho.is first', async () => {
      await expect(locateByIp()).resolves.toEqual({ name: 'Tel-Aviv', latitude: 32.0809, longitude: 34.7806 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a failed lookup', async () => toJsonResponse({ success: false, message: 'Reserved range' })],
      ['an error status', async () => toJsonResponse({}, 429)],
      ['a network error', async () => Promise.reject(new TypeError('fetch failed'))],
    ])('should fall back to geojs on %s', async (_case, response) => {
      ipWhoIs = response;

      await expect(locateByIp()).resolves.toEqual({ name: 'Rishon LeTsiyyon', latitude: 31.96, longitude: 34.8 });
      expect(String(fetchMock.mock.calls[1]?.[0])).toBe(GEO_JS_URL);
    });

    it('should return null when both services fail', async () => {
      fetchMock.mockImplementation(async () => Promise.reject(new TypeError('fetch failed')));

      await expect(locateByIp()).resolves.toBeNull();
    });
  });

  describe('loadCurrentPlace', () => {
    it('should cache the place for the IP location TTL', async () => {
      const { cache, fake } = toMapCache();

      const place = await loadCurrentPlace(cache);

      expect(fake.setWithTTL).toHaveBeenCalledWith('ip-location', { place }, { maxAge: IP_LOCATION_TTL });
    });

    it('should remember a failed lookup too, so a rerun does not ask the IP services again', async () => {
      fetchMock.mockImplementation(async () => Promise.reject(new TypeError('fetch failed')));
      const { cache, fake } = toMapCache();

      await expect(loadCurrentPlace(cache)).resolves.toBeNull();
      await expect(loadCurrentPlace(cache)).resolves.toBeNull();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fake.setWithTTL).toHaveBeenCalledWith('ip-location', { place: null }, { maxAge: IP_LOCATION_TTL });
    });
  });
});
