import { isBefore, isSameDay, parseISO, startOfHour } from 'date-fns';
import { type AlfredListItem, type AlfredScriptFilter, matches } from 'fast-alfred';
import {
  WORD_SEPARATOR,
  formatClock,
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
import type { ForecastResult } from '../forecast/forecast-store.model';
import { type Icons, toIssueItem } from './issue-items.service';
import { toTextItem } from './text-item.service';

type Hourly = Forecast['hourly'];

interface HourSlot {
  time: string;
  index: number;
}

function isShownHour({ time }: HourSlot, day: Date, currentHour: Date): boolean {
  const hour = parseISO(time);
  return isSameDay(hour, day) && !isBefore(hour, currentHour);
}

function toHourTitle(hourly: Hourly, { time, index }: HourSlot, temperature: number, code: number): string {
  const { emoji } = describeWeather(code, valueAt(hourly.is_day, index) !== 0);
  const apparent = valueAt(hourly.apparent_temperature, index);

  return joinSegments(
    [
      formatClock(time),
      emoji,
      formatTemperature(temperature),
      apparent !== null && `(feels ${formatTemperature(apparent)})`,
    ],
    WORD_SEPARATOR,
  );
}

function toHourSubtitle(hourly: Hourly, { index }: HourSlot): string {
  const uv = valueAt(hourly.uv_index, index);
  const humidity = valueAt(hourly.relative_humidity_2m, index);

  return joinSegments([
    formatRain(valueAt(hourly.precipitation_probability, index), valueAt(hourly.precipitation, index)),
    uv !== null && formatUv(uv),
    formatWind(
      valueAt(hourly.wind_speed_10m, index),
      valueAt(hourly.wind_direction_10m, index),
      valueAt(hourly.wind_gusts_10m, index),
    ),
    humidity !== null && `Humidity ${Math.round(humidity)}%`,
  ]);
}

/** Open-Meteo leaves the last hours of some places `null`, and an hour without a temperature or condition is dropped */
function toHourItem(hourly: Hourly, slot: HourSlot): AlfredListItem | null {
  const temperature = valueAt(hourly.temperature_2m, slot.index);
  const code = valueAt(hourly.weather_code, slot.index);
  if (temperature === null || code === null) {
    return null;
  }

  const title = toHourTitle(hourly, slot, temperature, code);
  const subtitle = toHourSubtitle(hourly, slot);
  return toTextItem(title, subtitle);
}

export function toHourItems(forecast: Forecast, date: string, now: number): AlfredListItem[] {
  const { hourly } = forecast;
  const day = parseISO(date);
  const placeNow = parseISO(toPlaceNow(forecast.utc_offset_seconds, now));
  const currentHour = startOfHour(placeNow);

  const slots = hourly.time.map((time, index) => ({ time, index }));
  const shown = slots.filter((slot) => isShownHour(slot, day, currentHour));
  const items = shown.map((slot) => toHourItem(hourly, slot));
  return items.filter((item): item is AlfredListItem => item !== null);
}

export function toHoursOutput(
  place: Place,
  date: string,
  result: ForecastResult,
  icons: Icons,
  now: number,
  filter: string,
): AlfredScriptFilter {
  if (result.kind === 'failed') {
    const issue = toIssueItem({ kind: 'request-failed', name: place.name, message: result.message }, icons);
    return { items: [issue], skipknowledge: true, rerun: RETRY_RERUN_SECONDS };
  }

  const rerun = result.kind === 'stale' ? RETRY_RERUN_SECONDS : undefined;
  const hours = toHourItems(result.forecast, date, now);
  if (!hours.length) {
    const issue = toIssueItem({ kind: 'no-hours', name: place.name }, icons);
    return { items: [issue], skipknowledge: true, rerun };
  }

  const items = matches(filter, hours, ({ title }) => title);
  return { items, skipknowledge: true, rerun };
}
