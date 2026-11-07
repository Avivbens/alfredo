import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { RETRY_RERUN_SECONDS } from '../../config/constants';
import { NOW, makeForecast } from '../../models/open-meteo.mock';
import type { ResolvedPlace } from '../../models/place.model';
import type { ForecastResult } from '../forecast/forecast-store.model';
import type { PlaceEntry } from '../location/places.service';
import { toIssueItem } from './issue-items.service';
import { ICONS } from './items.mock';
import { toPlaceItem, toPlacesOutput } from './place-items.service';

const CURRENT: ResolvedPlace = { name: '📍 Tel Aviv', latitude: 32.08, longitude: 34.78, source: 'current' };
const HAIFA: ResolvedPlace = { name: 'Haifa', latitude: 32.81, longitude: 34.99, source: 'saved' };

function fresh(forecast = makeForecast()): ForecastResult {
  return { kind: 'fresh', forecast, fetchedAt: NOW };
}

describe('place-items.service', () => {
  describe('toPlaceItem', () => {
    it("should show the current conditions and today's numbers", () => {
      const item = toPlaceItem(CURRENT, fresh(), ICONS, NOW);

      const title = '📍 Tel Aviv · 18° ⛈️ Thunderstorm';
      const subtitle = 'H 20° L 18° · Rain 100% 38 mm · UV 4.6 · Wind 6 km/h WSW';
      expect(item).toEqual({
        title,
        subtitle,
        valid: false,
        text: { copy: `${title} · ${subtitle}`, largetype: `${title}\n${subtitle}` },
      });
    });

    it('should mark a stale forecast with the time it was fetched', () => {
      const fetchedAt = Date.parse('2026-11-07T12:05:00Z');

      const item = toPlaceItem(CURRENT, { kind: 'stale', forecast: makeForecast(), fetchedAt }, ICONS, NOW);

      expect(item.subtitle).toBe(
        `Offline · updated ${format(fetchedAt, 'HH:mm')} · H 20° L 18° · Rain 100% 38 mm · UV 4.6 · Wind 6 km/h WSW`,
      );
    });

    it("should take today from the place's own date, not the Mac's", () => {
      const sydney = makeForecast({
        timezone: 'Australia/Sydney',
        utcOffsetSeconds: 39600,
        startDate: '2026-11-07',
        currentTime: '2026-11-08T04:00',
      });
      sydney.daily.temperature_2m_max[1] = 25;

      const item = toPlaceItem({ ...HAIFA, name: 'Sydney' }, fresh(sydney), ICONS, NOW);

      expect(item.subtitle).toMatch(/^H 25° L 18°/);
    });

    it('should leave out the day numbers when the cached forecast no longer has today', () => {
      const item = toPlaceItem(HAIFA, fresh(makeForecast({ startDate: '2026-11-05', days: 2 })), ICONS, NOW);

      expect(item.subtitle).toBe('Wind 6 km/h WSW');
    });

    it('should leave out values the forecast does not have', () => {
      const forecast = makeForecast();
      forecast.current.temperature_2m = null;
      forecast.daily.uv_index_max[0] = null;

      const item = toPlaceItem(HAIFA, fresh(forecast), ICONS, NOW);

      expect(item.title).toBe('Haifa · ⛈️ Thunderstorm');
      expect(item.subtitle).toBe('H 20° L 18° · Rain 100% 38 mm · Wind 6 km/h WSW');
    });

    it('should show a failed forecast as an issue row', () => {
      const item = toPlaceItem(CURRENT, { kind: 'failed', message: 'fetch failed' }, ICONS, NOW);

      expect(item).toEqual(
        toIssueItem({ kind: 'request-failed', name: '📍 Tel Aviv', message: 'fetch failed' }, ICONS),
      );
    });
  });

  describe('toPlacesOutput', () => {
    const entries: PlaceEntry[] = [
      { kind: 'issue', issue: { kind: 'place-not-found', name: 'Nowhere' } },
      { kind: 'place', place: HAIFA },
      { kind: 'place', place: { ...HAIFA, name: 'Office' } },
    ];

    it('should keep issues in place and pair each place with its result', () => {
      const output = toPlacesOutput(entries, [fresh(), fresh()], ICONS, NOW);

      expect(output.skipknowledge).toBe(true);
      expect(output.rerun).toBeUndefined();
      expect(output.items.map(({ title }) => title)).toEqual([
        'No place named "Nowhere"',
        'Haifa · 18° ⛈️ Thunderstorm',
        'Office · 18° ⛈️ Thunderstorm',
      ]);
    });

    it('should rerun while a forecast is stale or failed', () => {
      const stale: ForecastResult = { kind: 'stale', forecast: makeForecast(), fetchedAt: NOW };
      const failed: ForecastResult = { kind: 'failed', message: 'fetch failed' };

      expect(toPlacesOutput(entries, [fresh(), stale], ICONS, NOW).rerun).toBe(RETRY_RERUN_SECONDS);
      expect(toPlacesOutput(entries, [failed, fresh()], ICONS, NOW).rerun).toBe(RETRY_RERUN_SECONDS);
    });

    it('should rerun when a saved name could not be looked up', () => {
      const failedName: PlaceEntry = {
        kind: 'issue',
        issue: { kind: 'request-failed', name: 'Haifa', message: 'fetch failed' },
      };

      expect(toPlacesOutput([failedName], [], ICONS, NOW).rerun).toBe(RETRY_RERUN_SECONDS);
    });

    it('should not rerun for an unknown name or an undetected location', () => {
      const notFound: PlaceEntry = { kind: 'issue', issue: { kind: 'place-not-found', name: 'Nowhere' } };
      const noLocation: PlaceEntry = { kind: 'issue', issue: { kind: 'location-unavailable' } };

      expect(toPlacesOutput([notFound, noLocation], [], ICONS, NOW).rerun).toBeUndefined();
    });
  });
});
