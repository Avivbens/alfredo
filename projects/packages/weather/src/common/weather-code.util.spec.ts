import { describe, expect, it } from 'vitest';
import { describeWeather } from './weather-code.util';

describe('weather-code.util', () => {
  describe('describeWeather', () => {
    it('should describe a clear sky by day and by night', () => {
      expect(describeWeather(0)).toEqual({ label: 'Clear', emoji: '☀️' });
      expect(describeWeather(0, false)).toEqual({ label: 'Clear', emoji: '🌙' });
    });

    it('should describe thunderstorms and violent showers', () => {
      expect(describeWeather(95)).toEqual({ label: 'Thunderstorm', emoji: '⛈️' });
      expect(describeWeather(82)).toEqual({ label: 'Violent showers', emoji: '🌦️' });
    });

    it('should use the night emoji for night showers and keep single-emoji codes', () => {
      expect(describeWeather(80, false)).toEqual({ label: 'Showers', emoji: '🌧️' });
      expect(describeWeather(3, false)).toEqual({ label: 'Overcast', emoji: '☁️' });
    });

    it('should name the intensity of rain and snow', () => {
      expect(describeWeather(61).label).toBe('Light rain');
      expect(describeWeather(65).label).toBe('Heavy rain');
      expect(describeWeather(73).label).toBe('Snow');
    });

    it('should fall back to unknown for a missing or unlisted code', () => {
      expect(describeWeather(42)).toEqual({ label: 'Unknown', emoji: '🌡️' });
      expect(describeWeather(null)).toEqual({ label: 'Unknown', emoji: '🌡️' });
    });
  });
});
