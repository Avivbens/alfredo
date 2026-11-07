import { hoursToMilliseconds, minutesToMilliseconds } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FORECASTS_CACHE_KEY, FORECAST_KEEP_MS } from '../../config/constants';
import { NOW, makeForecast } from '../../models/open-meteo.mock';
import { fetchForecasts } from '../open-meteo/forecast.service';
import { toMapCache } from '../system/cache.mock';
import { loadForecasts, toForecastKey } from './forecast-store.service';

vi.mock('../open-meteo/forecast.service', () => ({ fetchForecasts: vi.fn() }));

const fetchForecastsMock = vi.mocked(fetchForecasts);

const TEL_AVIV = { name: 'Tel Aviv', latitude: 32.08, longitude: 34.78 };
const HAIFA = { name: 'Haifa', latitude: 32.81, longitude: 34.99 };
const TEL_AVIV_FORECAST = makeForecast();
const HAIFA_FORECAST = makeForecast({ timezone: 'Haifa marker' });

function toEntry(fetchedAt: number, forecast = TEL_AVIV_FORECAST) {
  return { fetchedAt, forecast };
}

describe('forecast-store.service', () => {
  beforeEach(() => {
    fetchForecastsMock.mockResolvedValue([HAIFA_FORECAST]);
  });

  describe('toForecastKey', () => {
    it('should round the coordinates to two decimals', () => {
      expect(toForecastKey({ latitude: 32.0849, longitude: 34.781 })).toBe('32.08,34.78');
    });
  });

  describe('loadForecasts', () => {
    it('should use a forecast younger than 15 minutes without fetching', async () => {
      const fetchedAt = NOW - minutesToMilliseconds(10);
      const { cache } = toMapCache({ [FORECASTS_CACHE_KEY]: { [toForecastKey(TEL_AVIV)]: toEntry(fetchedAt) } });

      const results = await loadForecasts(cache, [TEL_AVIV], NOW);

      expect(results).toEqual([{ kind: 'fresh', forecast: TEL_AVIV_FORECAST, fetchedAt }]);
      expect(fetchForecastsMock).not.toHaveBeenCalled();
    });

    it('should refetch an older forecast and keep the new one for 48 hours', async () => {
      fetchForecastsMock.mockResolvedValue([TEL_AVIV_FORECAST]);
      const { cache, fake } = toMapCache({
        [FORECASTS_CACHE_KEY]: { [toForecastKey(TEL_AVIV)]: toEntry(NOW - minutesToMilliseconds(20)) },
      });

      const results = await loadForecasts(cache, [TEL_AVIV], NOW);

      expect(results).toEqual([{ kind: 'fresh', forecast: TEL_AVIV_FORECAST, fetchedAt: NOW }]);
      expect(fake.setWithTTL).toHaveBeenCalledWith(
        FORECASTS_CACHE_KEY,
        { [toForecastKey(TEL_AVIV)]: { fetchedAt: NOW, forecast: TEL_AVIV_FORECAST } },
        { maxAge: FORECAST_KEEP_MS },
      );
    });

    it('should fetch only the missing places and keep the input order', async () => {
      const fetchedAt = NOW - minutesToMilliseconds(5);
      const { cache } = toMapCache({ [FORECASTS_CACHE_KEY]: { [toForecastKey(TEL_AVIV)]: toEntry(fetchedAt) } });

      const results = await loadForecasts(cache, [HAIFA, TEL_AVIV], NOW);

      expect(fetchForecastsMock).toHaveBeenCalledTimes(1);
      expect(fetchForecastsMock).toHaveBeenCalledWith([HAIFA]);
      expect(results).toEqual([
        { kind: 'fresh', forecast: HAIFA_FORECAST, fetchedAt: NOW },
        { kind: 'fresh', forecast: TEL_AVIV_FORECAST, fetchedAt },
      ]);
    });

    it('should send one coordinate pair for places that share a key', async () => {
      fetchForecastsMock.mockResolvedValue([TEL_AVIV_FORECAST]);
      const office = { name: 'Office', latitude: 32.0849, longitude: 34.781 };
      const { cache } = toMapCache();

      const results = await loadForecasts(cache, [TEL_AVIV, office], NOW);

      expect(fetchForecastsMock.mock.calls[0]?.[0]).toHaveLength(1);
      expect(results).toEqual([
        { kind: 'fresh', forecast: TEL_AVIV_FORECAST, fetchedAt: NOW },
        { kind: 'fresh', forecast: TEL_AVIV_FORECAST, fetchedAt: NOW },
      ]);
    });

    it('should fall back to an older forecast, or fail, when the request fails', async () => {
      fetchForecastsMock.mockRejectedValue(new Error('Open-Meteo answered HTTP 500'));
      const fetchedAt = NOW - hoursToMilliseconds(3);
      const { cache } = toMapCache({ [FORECASTS_CACHE_KEY]: { [toForecastKey(TEL_AVIV)]: toEntry(fetchedAt) } });

      const results = await loadForecasts(cache, [TEL_AVIV, HAIFA], NOW);

      expect(results).toEqual([
        { kind: 'stale', forecast: TEL_AVIV_FORECAST, fetchedAt },
        { kind: 'failed', message: 'Open-Meteo answered HTTP 500' },
      ]);
    });

    it('should keep every forecast under one key and drop those older than 48 hours', async () => {
      const kept = toEntry(NOW - hoursToMilliseconds(5));
      const { cache, store } = toMapCache({
        [FORECASTS_CACHE_KEY]: {
          [toForecastKey(TEL_AVIV)]: kept,
          '48.85,2.35': toEntry(NOW - hoursToMilliseconds(49)),
        },
      });

      await loadForecasts(cache, [HAIFA], NOW);

      expect([...store.keys()]).toEqual([FORECASTS_CACHE_KEY]);
      expect(store.get(FORECASTS_CACHE_KEY)).toEqual({
        [toForecastKey(TEL_AVIV)]: kept,
        [toForecastKey(HAIFA)]: { fetchedAt: NOW, forecast: HAIFA_FORECAST },
      });
    });

    it('should send nothing for no places', async () => {
      const { cache } = toMapCache();

      await expect(loadForecasts(cache, [], NOW)).resolves.toEqual([]);
      expect(fetchForecastsMock).not.toHaveBeenCalled();
    });
  });
});
