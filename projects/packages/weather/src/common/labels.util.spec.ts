import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
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
} from './labels.util';

/** 19:00 in Tel Aviv, 04:00 the next day in Sydney */
const NOW = Date.parse('2026-11-07T17:00:00Z');

describe('labels.util', () => {
  describe('formatTemperature', () => {
    it('should round to whole degrees without a negative zero', () => {
      expect(formatTemperature(18.4)).toBe('18°');
      expect(formatTemperature(-0.2)).toBe('0°');
    });
  });

  describe('formatAmount', () => {
    it('should keep one decimal below 10 and round from 10 up', () => {
      expect(formatAmount(0.6)).toBe('0.6 mm');
      expect(formatAmount(1)).toBe('1 mm');
      expect(formatAmount(37.6)).toBe('38 mm');
    });

    it('should use the given unit', () => {
      expect(formatAmount(0, 'cm')).toBe('0 cm');
    });
  });

  describe('formatUv', () => {
    it('should keep one decimal and drop a trailing zero', () => {
      expect(formatUv(4.6)).toBe('UV 4.6');
      expect(formatUv(2.35)).toBe('UV 2.4');
      expect(formatUv(0)).toBe('UV 0');
    });
  });

  describe('formatDuration', () => {
    it('should show hours and minutes, rounded to the minute', () => {
      expect(formatDuration(38615.42)).toBe('10 h 44 min');
      expect(formatDuration(2700)).toBe('45 min');
    });
  });

  describe('formatDistance', () => {
    it('should show kilometres from 1 km up and metres below', () => {
      expect(formatDistance(19620)).toBe('20 km');
      expect(formatDistance(800)).toBe('800 m');
    });
  });

  describe('formatClock', () => {
    it('should take the time of a local ISO string', () => {
      expect(formatClock('2026-11-07T06:02')).toBe('06:02');
    });
  });

  describe('toPlaceNow', () => {
    it('should give the local time at the place', () => {
      expect(toPlaceNow(7200, NOW)).toBe('2026-11-07T19:00');
      expect(toPlaceNow(39600, NOW)).toBe('2026-11-08T04:00');
    });
  });

  describe('formatDayLabel', () => {
    it('should name today and tomorrow, then the date', () => {
      expect(formatDayLabel('2026-11-08', '2026-11-08')).toBe('Today');
      expect(formatDayLabel('2026-11-09', '2026-11-08')).toBe('Tomorrow');
      expect(formatDayLabel('2026-11-10', '2026-11-08')).toBe('Tue 10 Nov');
    });
  });

  describe('formatRain', () => {
    it('should show the chance and an amount of at least 0.1', () => {
      expect(formatRain(100, 37.6)).toBe('Rain 100% 38 mm');
      expect(formatRain(5, 0.04)).toBe('Rain 5%');
    });

    it('should show what is known and nothing when both are missing', () => {
      expect(formatRain(null, 0.6)).toBe('Rain 0.6 mm');
      expect(formatRain(null, null)).toBeNull();
    });
  });

  describe('formatWind', () => {
    it('should show the speed, direction and gusts', () => {
      expect(formatWind(11.9, 225, 32.4)).toBe('Wind 12 km/h SW, gusts 32');
      expect(formatWind(6.3, 239, null)).toBe('Wind 6 km/h WSW');
    });

    it('should show nothing without a speed', () => {
      expect(formatWind(null, 225, 30)).toBeNull();
    });
  });

  describe('formatOffline', () => {
    it("should show when a stale forecast was fetched, in the Mac's time", () => {
      const fetchedAt = Date.parse('2026-11-07T12:05:00Z');

      expect(formatOffline(fetchedAt)).toBe(`Offline · updated ${format(fetchedAt, 'HH:mm')}`);
    });
  });

  describe('joinSegments', () => {
    it('should join the non-empty segments', () => {
      expect(joinSegments(['a', null, '', false, 'b'])).toBe('a · b');
    });

    it('should join with the given separator, such as words in a title', () => {
      expect(joinSegments(['Now', null, '18°'], WORD_SEPARATOR)).toBe('Now 18°');
    });
  });
});
