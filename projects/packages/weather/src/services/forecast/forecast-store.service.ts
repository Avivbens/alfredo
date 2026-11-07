import { toErrorMessage } from '../../common/error.util';
import { FORECASTS_CACHE_KEY, FORECAST_FRESH_MS, FORECAST_KEEP_MS } from '../../config/constants';
import type { CachedForecast, Forecast } from '../../models/open-meteo.schema';
import type { Coordinates } from '../../models/place.model';
import { fetchForecasts } from '../open-meteo/forecast.service';
import type { Cache } from '../system/cache.service';
import {
  type FetchedForecasts,
  type ForecastMap,
  type ForecastResult,
  NO_FORECAST_MESSAGE,
  forecastMapSchema,
} from './forecast-store.model';

export function toForecastKey({ latitude, longitude }: Coordinates): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function getCachedForecasts(cache: Cache): ForecastMap {
  const stored = forecastMapSchema.safeParse(cache.get<unknown>(FORECASTS_CACHE_KEY));
  return stored.success ? stored.data : {};
}

/** One key, pruned on every write: the cache only drops an entry when that exact key is read, so per-place keys would pile up */
function setCachedForecasts(cache: Cache, forecasts: ForecastMap, now: number): void {
  const kept = Object.entries(forecasts).filter(([, { fetchedAt }]) => now - fetchedAt < FORECAST_KEEP_MS);
  cache.setWithTTL(FORECASTS_CACHE_KEY, Object.fromEntries(kept), { maxAge: FORECAST_KEEP_MS });
}

/** Entries outlive their freshness so an offline run can fall back to them, so freshness comes from `fetchedAt`, not the cache TTL */
function isFresh(entry: CachedForecast | undefined, now: number): boolean {
  return entry !== undefined && now - entry.fetchedAt < FORECAST_FRESH_MS;
}

/** Places that round to one key share one coordinate pair in the request */
function toMissing(places: Coordinates[], stored: ForecastMap, now: number): Map<string, Coordinates> {
  const stale = places.filter((place) => !isFresh(stored[toForecastKey(place)], now));
  const entries = stale.map((place) => [toForecastKey(place), place] as const);
  return new Map(entries);
}

/** Open-Meteo answers in request order, so each forecast pairs with the key at its index */
function toForecastMap(keys: string[], forecasts: Forecast[], now: number): ForecastMap {
  const pairs = keys.map((key, index) => ({ key, forecast: forecasts[index] }));
  const answered = pairs.filter((pair): pair is { key: string; forecast: Forecast } => pair.forecast !== undefined);
  const entries = answered.map(({ key, forecast }) => [key, { fetchedAt: now, forecast }]);
  return Object.fromEntries(entries);
}

async function fetchMissing(missing: Map<string, Coordinates>, now: number): Promise<FetchedForecasts> {
  if (!missing.size) {
    return { fetched: {}, error: null };
  }

  try {
    const forecasts = await fetchForecasts([...missing.values()]);
    const fetched = toForecastMap([...missing.keys()], forecasts, now);
    return { fetched, error: null };
  } catch (error) {
    return { fetched: {}, error: toErrorMessage(error) };
  }
}

function toResult(key: string, stored: ForecastMap, { fetched, error }: FetchedForecasts, now: number): ForecastResult {
  const fetchedEntry = fetched[key];
  if (fetchedEntry) {
    return { kind: 'fresh', ...fetchedEntry };
  }

  const storedEntry = stored[key];
  if (storedEntry && isFresh(storedEntry, now)) {
    return { kind: 'fresh', ...storedEntry };
  }

  if (storedEntry) {
    return { kind: 'stale', ...storedEntry };
  }

  return { kind: 'failed', message: error ?? NO_FORECAST_MESSAGE };
}

export async function loadForecasts(cache: Cache, places: Coordinates[], now: number): Promise<ForecastResult[]> {
  const stored = getCachedForecasts(cache);
  const missing = toMissing(places, stored, now);
  const outcome = await fetchMissing(missing, now);
  if (Object.keys(outcome.fetched).length) {
    setCachedForecasts(cache, { ...stored, ...outcome.fetched }, now);
  }

  return places.map((place) => toResult(toForecastKey(place), stored, outcome, now));
}
