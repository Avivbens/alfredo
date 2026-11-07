import { z } from 'zod';

const value = z.number().nullable();
const values = z.array(value);
const times = z.array(z.string().nullable());

/** Every value is nullable: the last day and the last hours come back as `null` for some places */
export const forecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  utc_offset_seconds: z.number(),
  current: z.object({
    time: z.string(),
    temperature_2m: value,
    apparent_temperature: value,
    relative_humidity_2m: value,
    precipitation: value,
    weather_code: value,
    wind_speed_10m: value,
    wind_direction_10m: value,
    wind_gusts_10m: value,
    uv_index: value,
    is_day: value,
    cloud_cover: value,
    pressure_msl: value,
    visibility: value,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: values,
    temperature_2m_max: values,
    temperature_2m_min: values,
    apparent_temperature_max: values,
    apparent_temperature_min: values,
    precipitation_sum: values,
    rain_sum: values,
    showers_sum: values,
    snowfall_sum: values,
    precipitation_probability_max: values,
    precipitation_hours: values,
    uv_index_max: values,
    sunrise: times,
    sunset: times,
    daylight_duration: values,
    sunshine_duration: values,
    wind_speed_10m_max: values,
    wind_gusts_10m_max: values,
    wind_direction_10m_dominant: values,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: values,
    apparent_temperature: values,
    precipitation_probability: values,
    precipitation: values,
    weather_code: values,
    uv_index: values,
    wind_speed_10m: values,
    wind_direction_10m: values,
    wind_gusts_10m: values,
    relative_humidity_2m: values,
    is_day: values,
  }),
});

export type Forecast = z.infer<typeof forecastSchema>;

/** One place comes back as an object and several as an array, so both read as a list */
export const forecastResponseSchema = z.union([
  z.array(forecastSchema),
  forecastSchema.transform((forecast) => [forecast]),
]);

export const cachedForecastSchema = z.object({
  fetchedAt: z.number(),
  forecast: forecastSchema,
});

export type CachedForecast = z.infer<typeof cachedForecastSchema>;

export const geocodingResultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

export type GeocodingResult = z.infer<typeof geocodingResultSchema>;

/** Open-Meteo leaves `results` out when nothing matches */
export const geocodingResponseSchema = z.object({
  results: z.array(geocodingResultSchema).default([]),
});
