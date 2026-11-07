import { z } from 'zod';
import { type CachedForecast, cachedForecastSchema } from '../../models/open-meteo.schema';

export type LoadedForecast = CachedForecast & { kind: 'fresh' | 'stale' };
export type ForecastResult = LoadedForecast | { kind: 'failed'; message: string };

export const forecastMapSchema = z.record(z.string(), cachedForecastSchema);
export type ForecastMap = z.infer<typeof forecastMapSchema>;

export interface FetchedForecasts {
  fetched: ForecastMap;
  error: string | null;
}

export const NO_FORECAST_MESSAGE = 'Open-Meteo sent no forecast for this place';
