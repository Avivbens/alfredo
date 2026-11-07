import { hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const IP_WHO_IS_URL = 'https://ipwho.is/';
export const GEO_JS_URL = 'https://get.geojs.io/v1/ip/geo.json';

/** Open-Meteo's free forecast reaches 16 days */
export const FORECAST_DAYS = 16;
export const REQUEST_TIMEOUT_MS = secondsToMilliseconds(5);
export const RETRY_RERUN_SECONDS = 5;

export const FORECASTS_CACHE_KEY = 'forecasts';
export const FORECAST_FRESH_MS = minutesToMilliseconds(15);
/** Kept well past freshness so an offline run can still show the last forecast */
export const FORECAST_KEEP_MS = hoursToMilliseconds(48);
export const GEOCODE_TTL = hoursToMilliseconds(24 * 30);
export const IP_LOCATION_CACHE_KEY = 'ip-location';
export const IP_LOCATION_TTL = minutesToMilliseconds(15);
