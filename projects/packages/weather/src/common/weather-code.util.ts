export interface WeatherDescription {
  label: string;
  emoji: string;
}

interface WeatherCodeEntry {
  label: string;
  day: string;
  night?: string;
}

/** WMO weather interpretation codes, as Open-Meteo documents them */
const WEATHER_CODES: Record<number, WeatherCodeEntry> = {
  0: { label: 'Clear', day: '☀️', night: '🌙' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌙' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️' },
  3: { label: 'Overcast', day: '☁️' },
  45: { label: 'Fog', day: '🌫️' },
  48: { label: 'Fog', day: '🌫️' },
  51: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  55: { label: 'Drizzle', day: '🌦️', night: '🌧️' },
  56: { label: 'Freezing drizzle', day: '🌧️' },
  57: { label: 'Freezing drizzle', day: '🌧️' },
  61: { label: 'Light rain', day: '🌧️' },
  63: { label: 'Rain', day: '🌧️' },
  65: { label: 'Heavy rain', day: '🌧️' },
  66: { label: 'Freezing rain', day: '🌧️' },
  67: { label: 'Freezing rain', day: '🌧️' },
  71: { label: 'Light snow', day: '🌨️' },
  73: { label: 'Snow', day: '🌨️' },
  75: { label: 'Heavy snow', day: '🌨️' },
  77: { label: 'Snow grains', day: '🌨️' },
  80: { label: 'Showers', day: '🌦️', night: '🌧️' },
  81: { label: 'Showers', day: '🌦️', night: '🌧️' },
  82: { label: 'Violent showers', day: '🌦️', night: '🌧️' },
  85: { label: 'Snow showers', day: '🌨️' },
  86: { label: 'Snow showers', day: '🌨️' },
  95: { label: 'Thunderstorm', day: '⛈️' },
  96: { label: 'Thunderstorm with hail', day: '⛈️' },
  99: { label: 'Thunderstorm with hail', day: '⛈️' },
};

const UNKNOWN: WeatherDescription = { label: 'Unknown', emoji: '🌡️' };

export function describeWeather(code: number | null, isDay = true): WeatherDescription {
  const entry = code === null ? undefined : WEATHER_CODES[code];
  if (!entry) {
    return UNKNOWN;
  }

  const emoji = isDay ? entry.day : (entry.night ?? entry.day);
  return { label: entry.label, emoji };
}
