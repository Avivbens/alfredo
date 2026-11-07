import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred';
import {
  WORD_SEPARATOR,
  formatOffline,
  formatRain,
  formatTemperature,
  formatUv,
  formatWind,
  joinSegments,
  toPlaceNow,
} from '../../common/labels.util';
import { describeWeather } from '../../common/weather-code.util';
import { RETRY_RERUN_SECONDS } from '../../config/constants';
import type { Forecast } from '../../models/open-meteo.schema';
import type { ResolvedPlace } from '../../models/place.model';
import type { AppRouter } from '../../models/routes.model';
import type { ForecastResult } from '../forecast/forecast-store.model';
import { type PlaceEntry, isPlaceEntry } from '../location/places.service';
import { type Icons, toIssueItem } from './issue-items.service';
import type { SearchRows } from './search-items.model';
import { toItemText } from './text-item.service';

function toPlaceTitle(name: string, { current }: Forecast): string {
  const { emoji, label } = describeWeather(current.weather_code, current.is_day !== 0);
  const temperature = current.temperature_2m === null ? null : formatTemperature(current.temperature_2m);
  const conditions = joinSegments([temperature, emoji, label], WORD_SEPARATOR);
  return `${name} · ${conditions}`;
}

function toTodaySegments({ daily, utc_offset_seconds }: Forecast, now: number): Array<string | null> {
  const index = daily.time.indexOf(toPlaceNow(utc_offset_seconds, now).slice(0, 10));
  if (index < 0) {
    return [];
  }

  const high = daily.temperature_2m_max[index] ?? null;
  const low = daily.temperature_2m_min[index] ?? null;
  const uv = daily.uv_index_max[index] ?? null;
  return [
    high === null || low === null ? null : `H ${formatTemperature(high)} L ${formatTemperature(low)}`,
    formatRain(daily.precipitation_probability_max[index] ?? null, daily.precipitation_sum[index] ?? null),
    uv === null ? null : formatUv(uv),
  ];
}

export function toPlaceItem(
  place: ResolvedPlace,
  result: ForecastResult,
  icons: Icons,
  now: number,
  router: AppRouter,
): AlfredListItem {
  if (result.kind === 'failed') {
    return toIssueItem({ kind: 'request-failed', name: place.name, message: result.message }, icons);
  }

  const { forecast } = result;
  const title = toPlaceTitle(place.name, forecast);
  const subtitle = joinSegments([
    result.kind === 'stale' && formatOffline(result.fetchedAt),
    ...toTodaySegments(forecast, now),
    formatWind(forecast.current.wind_speed_10m, forecast.current.wind_direction_10m, null),
  ]);

  const { name, latitude, longitude } = place;
  return router.link('days', {
    label: name,
    state: { name, latitude, longitude },
    title,
    subtitle,
    text: toItemText(title, subtitle),
  });
}

/** `results` holds one forecast per place entry, in order, as `loadForecasts` returns them */
export function toPlacesOutput(
  entries: PlaceEntry[],
  results: ForecastResult[],
  icons: Icons,
  now: number,
  router: AppRouter,
  search: SearchRows = { items: [], failed: false },
): AlfredScriptFilter {
  const resultOf = new Map(entries.filter(isPlaceEntry).map((entry, index) => [entry, results[index]]));
  const items = entries.map((entry) => {
    if (!isPlaceEntry(entry)) {
      return toIssueItem(entry.issue, icons);
    }

    const result = resultOf.get(entry) ?? { kind: 'failed', message: 'No forecast was loaded' };
    return toPlaceItem(entry.place, result, icons, now, router);
  });

  /** A failed location lookup is left out: it is cached like a found one, so the IP services are asked at most every 15 minutes */
  const retrying =
    results.some(({ kind }) => kind !== 'fresh') ||
    entries.some((entry) => !isPlaceEntry(entry) && entry.issue.kind === 'request-failed') ||
    search.failed;
  return { items: [...items, ...search.items], skipknowledge: true, ...(retrying && { rerun: RETRY_RERUN_SECONDS }) };
}
