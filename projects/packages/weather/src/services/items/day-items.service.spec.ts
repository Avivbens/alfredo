import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { RETRY_RERUN_SECONDS } from '../../config/constants';
import { NOW, makeForecast } from '../../models/open-meteo.mock';
import { toDayItems, toDayLargeType, toDaysOutput, toNowItem } from './day-items.service';
import { toIssueItem } from './issue-items.service';
import { ICONS } from './items.mock';

const PLACE = { name: 'Tel Aviv', latitude: 32.08, longitude: 34.78 };
const DAY_SUBTITLE = 'Rain 100% 38 mm · UV 4.6 · Wind 12 km/h SW, gusts 32 · Sun 06:02 - 16:46';

describe('day-items.service', () => {
  describe('toNowItem', () => {
    it('should show the current conditions', () => {
      const item = toNowItem({ kind: 'fresh', forecast: makeForecast(), fetchedAt: NOW });

      expect(item.title).toBe('Now 18° (feels 20°) ⛈️ Thunderstorm');
      expect(item.subtitle).toBe(
        'Humidity 89% · Wind 6 km/h WSW, gusts 18 · UV 0 · Clouds 91% · 1015 hPa · Visibility 20 km',
      );
      expect(item.valid).toBe(false);
    });

    it('should mark a stale forecast', () => {
      const fetchedAt = Date.parse('2026-11-07T12:05:00Z');

      const item = toNowItem({ kind: 'stale', forecast: makeForecast(), fetchedAt });

      expect(item.subtitle).toMatch(new RegExp(`^Offline · updated ${format(fetchedAt, 'HH:mm')} · Humidity 89%`));
    });
  });

  describe('toDayItems', () => {
    it('should show one row per day from today', () => {
      const items = toDayItems(makeForecast(), NOW);

      expect(items.map(({ title }) => title)).toEqual([
        'Today ⛈️ 18° / 20°',
        'Tomorrow ⛈️ 18° / 20°',
        'Mon 9 Nov ⛈️ 18° / 20°',
      ]);
      expect(items.map(({ subtitle }) => subtitle)).toEqual([DAY_SUBTITLE, DAY_SUBTITLE, DAY_SUBTITLE]);
    });

    it('should drop a day without a temperature and leave out other missing values', () => {
      const forecast = makeForecast();
      forecast.daily.temperature_2m_max[2] = null;
      forecast.daily.uv_index_max[1] = null;

      const items = toDayItems(forecast, NOW);

      expect(items).toHaveLength(2);
      expect(items[1]?.subtitle).toBe('Rain 100% 38 mm · Wind 12 km/h SW, gusts 32 · Sun 06:02 - 16:46');
    });

    it('should drop the days before the place’s today from an older forecast', () => {
      const items = toDayItems(makeForecast({ startDate: '2026-11-06' }), NOW);

      expect(items[0]?.title).toBe('Today ⛈️ 18° / 20°');
      expect(items).toHaveLength(2);
    });

    it('should copy the row and show every field in Large Type', () => {
      const [today] = toDayItems(makeForecast(), NOW);

      expect(today?.text).toEqual({
        copy: `Today ⛈️ 18° / 20° · ${DAY_SUBTITLE}`,
        largetype: toDayLargeType(makeForecast(), 0, '2026-11-07'),
      });
    });
  });

  describe('toDayLargeType', () => {
    it('should list every field of the day', () => {
      expect(toDayLargeType(makeForecast(), 0, '2026-11-07')).toBe(
        [
          'Today · Thunderstorm',
          '18° / 20° · feels 19° / 21°',
          'Rain 100% 38 mm in 24 h · rain 0 mm, showers 38 mm, snow 0 cm',
          'UV 4.6',
          'Wind 12 km/h SW, gusts 32',
          'Sun 06:02 - 16:46 · daylight 10 h 44 min · sunshine 7 h 38 min',
        ].join('\n'),
      );
    });
  });

  describe('toDaysOutput', () => {
    it('should list now, then the days, filtered by what is typed', () => {
      const output = toDaysOutput(
        PLACE,
        { kind: 'fresh', forecast: makeForecast(), fetchedAt: NOW },
        ICONS,
        NOW,
        'tom',
      );

      expect(output.items.map(({ title }) => title)).toEqual(['Tomorrow ⛈️ 18° / 20°']);
      expect(output.skipknowledge).toBe(true);
      expect(output.rerun).toBeUndefined();
    });

    it('should rerun while the forecast is stale', () => {
      const output = toDaysOutput(PLACE, { kind: 'stale', forecast: makeForecast(), fetchedAt: NOW }, ICONS, NOW, '');

      expect(output.items).toHaveLength(4);
      expect(output.rerun).toBe(RETRY_RERUN_SECONDS);
    });

    it('should show a failed forecast as one issue row and rerun', () => {
      const output = toDaysOutput(PLACE, { kind: 'failed', message: 'fetch failed' }, ICONS, NOW, '');

      expect(output.items).toEqual([
        toIssueItem({ kind: 'request-failed', name: 'Tel Aviv', message: 'fetch failed' }, ICONS),
      ]);
      expect(output.rerun).toBe(RETRY_RERUN_SECONDS);
    });
  });
});
