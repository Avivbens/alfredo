import { describe, expect, it } from 'vitest';
import { RETRY_RERUN_SECONDS } from '../../config/constants';
import { NOW, makeForecast } from '../../models/open-meteo.mock';
import { toHourItems, toHoursOutput } from './hour-items.service';
import { toIssueItem } from './issue-items.service';
import { ICONS } from './items.mock';

const PLACE = { name: 'Tel Aviv', latitude: 32.08, longitude: 34.78 };

function toClocks(items: Array<{ title: string }>): string[] {
  return items.map(({ title }) => title.slice(0, 5));
}

describe('hour-items.service', () => {
  describe('toHourItems', () => {
    it("should start today's hours at the place's current hour", () => {
      const items = toHourItems(makeForecast(), '2026-11-07', NOW);

      expect(toClocks(items)).toEqual(['19:00', '20:00', '21:00', '22:00', '23:00']);
      expect(items[0]?.title).toBe('19:00 🌦️ 18° (feels 17°)');
      expect(items[0]?.subtitle).toBe('Rain 40% 0.6 mm · UV 2.4 · Wind 12 km/h SW, gusts 20 · Humidity 70%');
      expect(items[0]?.valid).toBe(false);
    });

    it('should show every hour of another day', () => {
      const items = toHourItems(makeForecast(), '2026-11-08', NOW);

      expect(items).toHaveLength(24);
      expect(toClocks(items).at(0)).toBe('00:00');
      expect(toClocks(items).at(-1)).toBe('23:00');
    });

    it('should use the night emoji after dark', () => {
      const forecast = makeForecast();
      forecast.hourly.is_day[24] = 0;

      expect(toHourItems(forecast, '2026-11-08', NOW)[0]?.title).toBe('00:00 🌧️ 18° (feels 17°)');
    });

    it("should start Sydney's today at its own current hour", () => {
      const sydney = makeForecast({
        timezone: 'Australia/Sydney',
        utcOffsetSeconds: 39600,
        startDate: '2026-11-08',
        currentTime: '2026-11-08T04:00',
      });

      expect(toClocks(toHourItems(sydney, '2026-11-08', NOW)).at(0)).toBe('04:00');
    });

    it('should drop hours without a temperature', () => {
      const forecast = makeForecast();
      forecast.hourly.temperature_2m.fill(null, 66, 72);

      expect(toHourItems(forecast, '2026-11-09', NOW)).toHaveLength(18);

      forecast.hourly.temperature_2m.fill(null, 48, 72);
      expect(toHourItems(forecast, '2026-11-09', NOW)).toEqual([]);
    });
  });

  describe('toHoursOutput', () => {
    it('should list the hours filtered by what is typed', () => {
      const result = { kind: 'fresh', forecast: makeForecast(), fetchedAt: NOW } as const;

      const output = toHoursOutput(PLACE, '2026-11-07', result, ICONS, NOW, '21');

      expect(toClocks(output.items)).toEqual(['21:00']);
      expect(output.skipknowledge).toBe(true);
      expect(output.rerun).toBeUndefined();
    });

    it('should say when the day has no hours', () => {
      const forecast = makeForecast();
      forecast.hourly.temperature_2m.fill(null);

      const output = toHoursOutput(PLACE, '2026-11-08', { kind: 'fresh', forecast, fetchedAt: NOW }, ICONS, NOW, '');

      expect(output.items).toEqual([toIssueItem({ kind: 'no-hours', name: 'Tel Aviv' }, ICONS)]);
    });

    it('should rerun on a stale forecast and show a failed one as an issue', () => {
      const stale = { kind: 'stale', forecast: makeForecast(), fetchedAt: NOW } as const;
      const failed = { kind: 'failed', message: 'fetch failed' } as const;

      expect(toHoursOutput(PLACE, '2026-11-08', stale, ICONS, NOW, '').rerun).toBe(RETRY_RERUN_SECONDS);
      expect(toHoursOutput(PLACE, '2026-11-08', failed, ICONS, NOW, '')).toEqual({
        items: [toIssueItem({ kind: 'request-failed', name: 'Tel Aviv', message: 'fetch failed' }, ICONS)],
        skipknowledge: true,
        rerun: RETRY_RERUN_SECONDS,
      });
    });
  });
});
