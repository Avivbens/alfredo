import { type AlfredListItem, type AlfredScriptFilter, matches } from 'fast-alfred';
import {
  LINE_SEPARATOR,
  LIST_SEPARATOR,
  WORD_SEPARATOR,
  formatAmount,
  formatClock,
  formatDayLabel,
  formatDistance,
  formatDuration,
  formatOffline,
  formatRain,
  formatTemperature,
  formatUv,
  formatWind,
  joinSegments,
  toPlaceNow,
} from '../../common/labels.util';
import { valueAt } from '../../common/series.util';
import { describeWeather } from '../../common/weather-code.util';
import { RETRY_RERUN_SECONDS } from '../../config/constants';
import type { Forecast } from '../../models/open-meteo.schema';
import type { Place } from '../../models/place.model';
import type { AppRouter } from '../../models/routes.model';
import type { ForecastResult, LoadedForecast } from '../forecast/forecast-store.model';
import { type Icons, toIssueItem } from './issue-items.service';
import { toItemText, toTextItem } from './text-item.service';

type Daily = Forecast['daily'];

export function toNowItem(result: LoadedForecast): AlfredListItem {
  const { current } = result.forecast;
  const { emoji, label } = describeWeather(current.weather_code, current.is_day !== 0);
  const title = joinSegments(
    [
      /** The row's name, always "Now" */
      'Now',
      /** Temperature right now, e.g. "18°" */
      current.temperature_2m !== null && formatTemperature(current.temperature_2m),
      /** Feels-like temperature, e.g. "(feels 20°)" */
      current.apparent_temperature !== null && `(feels ${formatTemperature(current.apparent_temperature)})`,
      /** Condition icon, the night one after dark, e.g. "⛈️" */
      emoji,
      /** Condition name, e.g. "Thunderstorm" */
      label,
    ],
    WORD_SEPARATOR,
  );

  const subtitle = joinSegments([
    /** Only for a cached forecast, e.g. "Offline · updated 14:05" */
    result.kind === 'stale' && formatOffline(result.fetchedAt),
    /** Relative humidity, e.g. "Humidity 89%" */
    current.relative_humidity_2m !== null && `Humidity ${Math.round(current.relative_humidity_2m)}%`,
    /** Wind speed, direction and gusts, e.g. "Wind 6 km/h WSW, gusts 18" */
    formatWind(current.wind_speed_10m, current.wind_direction_10m, current.wind_gusts_10m),
    /** UV index right now, e.g. "UV 0" */
    current.uv_index !== null && formatUv(current.uv_index),
    /** Cloud cover, e.g. "Clouds 91%" */
    current.cloud_cover !== null && `Clouds ${Math.round(current.cloud_cover)}%`,
    /** Sea-level pressure, e.g. "1015 hPa" */
    current.pressure_msl !== null && `${Math.round(current.pressure_msl)} hPa`,
    /** How far you can see, e.g. "Visibility 20 km" */
    current.visibility !== null && `Visibility ${formatDistance(current.visibility)}`,
  ]);

  return toTextItem(title, subtitle);
}

function formatSun(daily: Daily, index: number): string | null {
  const sunrise = daily.sunrise[index];
  const sunset = daily.sunset[index];
  if (!sunrise || !sunset) {
    return null;
  }

  return `Sun ${formatClock(sunrise)} - ${formatClock(sunset)}`;
}

function toDaySubtitle(daily: Daily, index: number): string {
  const uv = valueAt(daily.uv_index_max, index);
  return joinSegments([
    formatRain(valueAt(daily.precipitation_probability_max, index), valueAt(daily.precipitation_sum, index)),
    uv !== null && formatUv(uv),
    formatWind(
      valueAt(daily.wind_speed_10m_max, index),
      valueAt(daily.wind_direction_10m_dominant, index),
      valueAt(daily.wind_gusts_10m_max, index),
    ),
    formatSun(daily, index),
  ]);
}

function formatRange(low: number | null, high: number | null): string | null {
  if (low === null || high === null) {
    return null;
  }

  return `${formatTemperature(low)} / ${formatTemperature(high)}`;
}

function formatRainDetail(daily: Daily, index: number): string {
  const rain = formatRain(valueAt(daily.precipitation_probability_max, index), valueAt(daily.precipitation_sum, index));
  const hours = valueAt(daily.precipitation_hours, index);
  const rainSum = valueAt(daily.rain_sum, index);
  const showersSum = valueAt(daily.showers_sum, index);
  const snowSum = valueAt(daily.snowfall_sum, index);
  const split = joinSegments(
    [
      rainSum !== null && `rain ${formatAmount(rainSum)}`,
      showersSum !== null && `showers ${formatAmount(showersSum)}`,
      snowSum !== null && `snow ${formatAmount(snowSum, 'cm')}`,
    ],
    LIST_SEPARATOR,
  );

  return joinSegments([rain && hours !== null ? `${rain} in ${Math.round(hours)} h` : rain, split]);
}

export function toDayLargeType(forecast: Forecast, index: number, today: string): string {
  const { daily } = forecast;
  const date = daily.time[index] ?? today;
  const { label } = describeWeather(valueAt(daily.weather_code, index));
  const feels = formatRange(
    valueAt(daily.apparent_temperature_min, index),
    valueAt(daily.apparent_temperature_max, index),
  );
  const uv = valueAt(daily.uv_index_max, index);
  const daylight = valueAt(daily.daylight_duration, index);
  const sunshine = valueAt(daily.sunshine_duration, index);

  return joinSegments(
    [
      `${formatDayLabel(date, today)} · ${label}`,
      joinSegments([
        formatRange(valueAt(daily.temperature_2m_min, index), valueAt(daily.temperature_2m_max, index)),
        feels && `feels ${feels}`,
      ]),
      formatRainDetail(daily, index),
      uv !== null && formatUv(uv),
      formatWind(
        valueAt(daily.wind_speed_10m_max, index),
        valueAt(daily.wind_direction_10m_dominant, index),
        valueAt(daily.wind_gusts_10m_max, index),
      ),
      joinSegments([
        formatSun(daily, index),
        daylight !== null && `daylight ${formatDuration(daylight)}`,
        sunshine !== null && `sunshine ${formatDuration(sunshine)}`,
      ]),
    ],
    LINE_SEPARATOR,
  );
}

export function toDayItems(place: Place, forecast: Forecast, now: number, router: AppRouter): AlfredListItem[] {
  const { daily } = forecast;
  const { name, latitude, longitude } = place;
  const today = toPlaceNow(forecast.utc_offset_seconds, now).slice(0, 10);

  /** `toVariables()` keeps only this run's links, so without this the days route is lost when filtering or going back from hours */
  router.link('days', { label: name, state: { name, latitude, longitude }, title: name });

  return daily.time.flatMap((date, index) => {
    const range = formatRange(valueAt(daily.temperature_2m_min, index), valueAt(daily.temperature_2m_max, index));
    const code = valueAt(daily.weather_code, index);
    if (date < today || !range || code === null) {
      return [];
    }

    const dayLabel = formatDayLabel(date, today);
    const title = `${dayLabel} ${describeWeather(code).emoji} ${range}`;
    const subtitle = toDaySubtitle(daily, index);
    return [
      router.link('hours', {
        label: `${name} › ${dayLabel}`,
        state: { name, latitude, longitude, date },
        title,
        subtitle,
        text: toItemText(title, subtitle, toDayLargeType(forecast, index, today)),
      }),
    ];
  });
}

export function toDaysOutput(
  place: Place,
  result: ForecastResult,
  icons: Icons,
  now: number,
  filter: string,
  router: AppRouter,
): AlfredScriptFilter {
  if (result.kind === 'failed') {
    const issue = toIssueItem({ kind: 'request-failed', name: place.name, message: result.message }, icons);
    return { items: [issue], skipknowledge: true, rerun: RETRY_RERUN_SECONDS };
  }

  const items = [toNowItem(result), ...toDayItems(place, result.forecast, now, router)];
  return {
    items: matches(filter, items, ({ title }) => title),
    skipknowledge: true,
    ...(result.kind === 'stale' && { rerun: RETRY_RERUN_SECONDS }),
  };
}
