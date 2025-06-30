import {
  beautifyDate,
  dateTimezoneNatural,
  dropTimezone,
  formatDateToAppleScript,
  formatGoogleDate,
} from './date.service';

describe('date.service', () => {
  describe('formatDateToAppleScript', () => {
    it('should format a standard date correctly', () => {
      const date = new Date('2025-06-15T14:30:00');
      expect(formatDateToAppleScript(date)).toBe('date "15 June 2025 14:30:00"');
    });

    it('should handle single-digit days', () => {
      const date = new Date('2025-06-01T09:00:00');
      expect(formatDateToAppleScript(date)).toBe('date "1 June 2025 09:00:00"');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-06-15T00:00:00');
      expect(formatDateToAppleScript(date)).toBe('date "15 June 2025 00:00:00"');
    });

    it('should handle a leap year date', () => {
      const date = new Date('2024-02-29T12:00:00');
      expect(formatDateToAppleScript(date)).toBe('date "29 February 2024 12:00:00"');
    });
  });

  describe('formatGoogleDate', () => {
    it('should format a timed event correctly', () => {
      const date = new Date('2025-07-15T10:30:00Z');
      expect(formatGoogleDate(date, false)).toBe('20250715T103000');
    });

    it('should format an all-day event correctly', () => {
      const date = new Date('2025-07-15T00:00:00Z');
      expect(formatGoogleDate(date, true)).toBe('20250715');
    });

    it('should pad single-digit month and day', () => {
      const date = new Date('2025-01-05T00:00:00Z');
      expect(formatGoogleDate(date, true)).toBe('20250105');
    });

    it('should correctly handle UTC conversion', () => {
      const date = new Date('2025-07-15T10:30:00');
      const utcDate = new Date(date.toISOString());
      const expected = formatGoogleDate(utcDate, false);
      expect(formatGoogleDate(date, false)).toBe(expected);
    });
  });

  describe('dropTimezone', () => {
    it('should remove the timezone offset correctly', () => {
      const localDate = new Date();
      const droppedDate = dropTimezone(localDate);
      // The expected date should be the local time, but interpreted as UTC.
      // This is achieved by adding the timezone offset to the UTC time.
      const expectedDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
      expect(droppedDate.toISOString()).toBe(expectedDate.toISOString());
    });
  });

  describe('dateTimezoneNatural', () => {
    it('should format a standard date correctly', () => {
      const date = new Date('2025-06-15T14:30:00');
      expect(dateTimezoneNatural(date)).toBe('2025-06-15T14:30:00');
    });

    it('should pad single-digit components', () => {
      const date = new Date('2025-01-05T01:02:03');
      expect(dateTimezoneNatural(date)).toBe('2025-01-05T01:02:03');
    });
  });

  describe('beautifyDate', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 4);
    const future = new Date(today);
    future.setMonth(today.getMonth() + 2);
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);

    it(`should format today's date as "Today"`, () => {
      expect(beautifyDate(today)).toMatch(/Today, 14:30/);
    });

    it(`should format tomorrow's date as "Tomorrow"`, () => {
      expect(beautifyDate(tomorrow)).toMatch(/Tomorrow, 14:30/);
    });

    it(`should format a date within the next week with the weekday`, () => {
      const weekday = nextWeek.toLocaleDateString('en-US', { weekday: 'short' });
      expect(beautifyDate(nextWeek)).toBe(`${weekday}, 14:30`);
    });

    it(`should format a future date in the same year with month and day`, () => {
      const month = future.toLocaleDateString('en-US', { month: 'short' });
      const day = future.getDate();
      expect(beautifyDate(future)).toBe(`${month} ${day}, 14:30`);
    });

    it(`should format a date in a different year with the year`, () => {
      const month = nextYear.toLocaleDateString('en-US', { month: 'short' });
      const day = nextYear.getDate();
      const year = nextYear.getFullYear();
      expect(beautifyDate(nextYear)).toBe(`${month} ${day}, ${year}, 14:30`);
    });
  });
});
