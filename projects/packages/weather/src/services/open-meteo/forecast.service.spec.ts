import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeForecast } from '../../models/open-meteo.mock';
import { forecastSchema } from '../../models/open-meteo.schema';
import { fetchForecasts } from './forecast.service';

const TEL_AVIV = { latitude: 32.08, longitude: 34.78 };
const HAIFA = { latitude: 32.81, longitude: 34.99 };

function toJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function toFields(shape: Record<string, unknown>): string {
  return Object.keys(shape)
    .filter((key) => key !== 'time')
    .join(',');
}

describe('forecast.service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => toJsonResponse([makeForecast(), makeForecast()]));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchForecasts', () => {
    it('should ask for every place in one request', async () => {
      const forecasts = await fetchForecasts([TEL_AVIV, HAIFA]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(forecasts).toHaveLength(2);

      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        latitude: '32.08,32.81',
        longitude: '34.78,34.99',
        timezone: 'auto',
        forecast_days: '16',
        current: toFields(forecastSchema.shape.current.shape),
        daily: toFields(forecastSchema.shape.daily.shape),
        hourly: toFields(forecastSchema.shape.hourly.shape),
      });
    });

    it('should ask for the fields the rows read', async () => {
      await fetchForecasts([TEL_AVIV]);

      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.searchParams.get('daily')?.split(',')).toContain('uv_index_max');
      expect(url.searchParams.get('hourly')?.split(',')).toContain('precipitation_probability');
    });

    it('should read the answer for a single place as a list of one', async () => {
      fetchMock.mockImplementation(async () => toJsonResponse(makeForecast()));

      await expect(fetchForecasts([TEL_AVIV])).resolves.toHaveLength(1);
    });

    it('should reject with the HTTP status', async () => {
      fetchMock.mockImplementation(async () => toJsonResponse({ reason: 'busy' }, 500));

      await expect(fetchForecasts([TEL_AVIV])).rejects.toThrow('Open-Meteo answered HTTP 500');
    });
  });
});
