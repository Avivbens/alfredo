import { FORECAST_DAYS, FORECAST_URL } from '../../config/constants';
import { type Forecast, forecastResponseSchema, forecastSchema } from '../../models/open-meteo.schema';
import type { Coordinates } from '../../models/place.model';
import { fetchJson } from '../system/http.service';

/** Requested fields come from the schema, so the request and what the rows read cannot drift */
function toFieldList(shape: Record<string, unknown>): string {
  return Object.keys(shape)
    .filter((key) => key !== 'time')
    .join(',');
}

const CURRENT_FIELDS = toFieldList(forecastSchema.shape.current.shape);
const DAILY_FIELDS = toFieldList(forecastSchema.shape.daily.shape);
const HOURLY_FIELDS = toFieldList(forecastSchema.shape.hourly.shape);

export async function fetchForecasts(places: Coordinates[]): Promise<Forecast[]> {
  const params = new URLSearchParams({
    latitude: places.map(({ latitude }) => latitude).join(','),
    longitude: places.map(({ longitude }) => longitude).join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
    current: CURRENT_FIELDS,
    daily: DAILY_FIELDS,
    hourly: HOURLY_FIELDS,
  });

  const body = await fetchJson(`${FORECAST_URL}?${params}`, 'Open-Meteo');
  return forecastResponseSchema.parse(body);
}
