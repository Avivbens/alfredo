import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../models/calendar-event.model';
import { toEventPayload } from './eventkit-payload.service';

const baseEvent: CalendarEvent = {
  summary: 'Standup',
  startDate: new Date('2026-11-02T09:00:00.000Z'),
  endDate: new Date('2026-11-02T10:00:00.000Z'),
  allDayEvent: false,
  description: 'Daily sync',
  location: 'Room 1',
  url: 'https://example.com',
};
const options = { calendarName: 'Work', systemTimeZone: 'Asia/Jerusalem' };

describe('eventkit-payload.service', () => {
  describe('toEventPayload', () => {
    it("should use the event's time zone", () => {
      expect(toEventPayload({ ...baseEvent, timeZone: 'America/New_York' }, options)).toEqual({
        title: 'Standup',
        start: '2026-11-02T09:00:00.000Z',
        end: '2026-11-02T10:00:00.000Z',
        allDay: false,
        calendarName: 'Work',
        location: 'Room 1',
        notes: 'Daily sync',
        url: 'https://example.com',
        timeZone: 'America/New_York',
        alertMinutes: undefined,
      });
    });

    it('should fall back to the system time zone', () => {
      expect(toEventPayload(baseEvent, options).timeZone).toBe('Asia/Jerusalem');
    });

    it('should leave all-day events floating', () => {
      expect(toEventPayload({ ...baseEvent, allDayEvent: true, timeZone: 'America/New_York' }, options)).toMatchObject({
        allDay: true,
        timeZone: undefined,
      });
    });

    it('should carry the alert minutes', () => {
      expect(toEventPayload(baseEvent, { ...options, alertMinutes: 15 }).alertMinutes).toBe(15);
    });

    it('should leave the alert out of all-day events, since an alert before midnight is noise', () => {
      expect(toEventPayload({ ...baseEvent, allDayEvent: true }, { ...options, alertMinutes: 15 }).alertMinutes).toBe(
        undefined,
      );
    });

    describe('all-day end', () => {
      /** Local constructors keep these specs independent of the machine's time zone, as all-day events float. */
      function toAllDayPayload(startDate: Date, endDate: Date): ReturnType<typeof toEventPayload> {
        return toEventPayload({ ...baseEvent, allDayEvent: true, startDate, endDate }, options);
      }

      it('should end a single day a second before the next midnight, because EventKit ends all-day events inclusively', () => {
        expect(toAllDayPayload(new Date(2026, 10, 5), new Date(2026, 10, 6)).end).toBe(
          new Date(2026, 10, 5, 23, 59, 59).toISOString(),
        );
      });

      it('should end a multi-day range a second before its last midnight', () => {
        expect(toAllDayPayload(new Date(2026, 10, 5), new Date(2026, 10, 8)).end).toBe(
          new Date(2026, 10, 7, 23, 59, 59).toISOString(),
        );
      });

      it('should keep an end that is not midnight', () => {
        expect(toAllDayPayload(new Date(2026, 10, 5), new Date(2026, 10, 6, 12)).end).toBe(
          new Date(2026, 10, 6, 12).toISOString(),
        );
      });

      it('should keep an end that is not after the start', () => {
        expect(toAllDayPayload(new Date(2026, 10, 5), new Date(2026, 10, 5)).end).toBe(
          new Date(2026, 10, 5).toISOString(),
        );
      });

      it("should keep a timed event's midnight end", () => {
        const payload = toEventPayload(
          { ...baseEvent, startDate: new Date(2026, 10, 5, 22), endDate: new Date(2026, 10, 6) },
          options,
        );

        expect(payload.end).toBe(new Date(2026, 10, 6).toISOString());
      });
    });
  });
});
