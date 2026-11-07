import { addDays, format, parseISO } from 'date-fns';
import type { Forecast } from './open-meteo.schema';

/** 19:00 in Tel Aviv, 04:00 the next day in Sydney */
export const NOW = Date.parse('2026-11-07T17:00:00Z');

interface ForecastOptions {
  timezone?: string;
  utcOffsetSeconds?: number;
  startDate?: string;
  days?: number;
  currentTime?: string;
}

function repeat<T>(count: number, item: T): T[] {
  return Array.from({ length: count }, () => item);
}

/** Values copied from a live Open-Meteo response for Tel Aviv on 2026-11-07 */
export function makeForecast({
  timezone = 'Asia/Jerusalem',
  utcOffsetSeconds = 7200,
  startDate = '2026-11-07',
  days = 3,
  currentTime = '2026-11-07T19:00',
}: ForecastOptions = {}): Forecast {
  const dates = Array.from({ length: days }, (_, index) => format(addDays(parseISO(startDate), index), 'yyyy-MM-dd'));
  const hours = dates.flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`),
  );
  const hourCount = hours.length;

  return {
    latitude: 32.08,
    longitude: 34.78,
    timezone,
    utc_offset_seconds: utcOffsetSeconds,
    current: {
      time: currentTime,
      temperature_2m: 18.4,
      apparent_temperature: 19.9,
      relative_humidity_2m: 89,
      precipitation: 0.4,
      weather_code: 95,
      wind_speed_10m: 6.3,
      wind_direction_10m: 239,
      wind_gusts_10m: 18,
      uv_index: 0,
      is_day: 0,
      cloud_cover: 91,
      pressure_msl: 1015.1,
      visibility: 19620,
    },
    daily: {
      time: dates,
      weather_code: repeat(days, 95),
      temperature_2m_max: repeat(days, 20.3),
      temperature_2m_min: repeat(days, 17.9),
      apparent_temperature_max: repeat(days, 21.2),
      apparent_temperature_min: repeat(days, 19.1),
      precipitation_sum: repeat(days, 37.6),
      rain_sum: repeat(days, 0),
      showers_sum: repeat(days, 37.6),
      snowfall_sum: repeat(days, 0),
      precipitation_probability_max: repeat(days, 100),
      precipitation_hours: repeat(days, 24),
      uv_index_max: repeat(days, 4.6),
      sunrise: dates.map((date) => `${date}T06:02`),
      sunset: dates.map((date) => `${date}T16:46`),
      daylight_duration: repeat(days, 38615.42),
      sunshine_duration: repeat(days, 27485.81),
      wind_speed_10m_max: repeat(days, 11.9),
      wind_gusts_10m_max: repeat(days, 32.4),
      wind_direction_10m_dominant: repeat(days, 225),
    },
    hourly: {
      time: hours,
      temperature_2m: repeat(hourCount, 18.2),
      apparent_temperature: repeat(hourCount, 17.4),
      precipitation_probability: repeat(hourCount, 40),
      precipitation: repeat(hourCount, 0.6),
      weather_code: repeat(hourCount, 80),
      uv_index: repeat(hourCount, 2.35),
      wind_speed_10m: repeat(hourCount, 12.4),
      wind_direction_10m: repeat(hourCount, 225),
      wind_gusts_10m: repeat(hourCount, 20.1),
      relative_humidity_2m: repeat(hourCount, 70),
      is_day: repeat(hourCount, 1),
    },
  };
}
