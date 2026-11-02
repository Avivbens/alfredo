import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../models/calendar-event.model';
import type { Reminder } from '../models/reminder.model';
import { toEventPayload, toReminderPayload } from './eventkit-payload.service';

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

  describe('toReminderPayload', () => {
    /** Local constructors keep these specs independent of the machine's time zone, as due components are local. */
    const timedReminder: Reminder = { title: 'Call the bank', dueDate: new Date(2026, 10, 3, 9, 30), allDay: false };
    const listOptions = { listName: 'Home' };

    it('should send date-only components for an all-day reminder', () => {
      expect(
        toReminderPayload({ ...timedReminder, dueDate: new Date(2026, 10, 3), allDay: true }, listOptions),
      ).toEqual({
        title: 'Call the bank',
        listName: 'Home',
        due: { year: 2026, month: 11, day: 3 },
        alarmAtDue: false,
      });
    });

    it('should alarm at the due time for a timed reminder', () => {
      expect(toReminderPayload(timedReminder, listOptions)).toEqual({
        title: 'Call the bank',
        listName: 'Home',
        due: { year: 2026, month: 11, day: 3, hour: 9, minute: 30 },
        alarmAtDue: true,
      });
    });

    it('should send no due date and no alarm for an undated reminder', () => {
      expect(toReminderPayload({ title: 'Buy milk', allDay: false }, {})).toEqual({
        title: 'Buy milk',
        alarmAtDue: false,
      });
    });

    it('should map weekdays to EventKit numbers with Sunday as 1', () => {
      const payload = toReminderPayload(
        {
          ...timedReminder,
          recurrence: 'every week on Sunday, Monday and Saturday',
          recurrenceRule: { frequency: 'weekly', interval: 1, daysOfWeek: ['sunday', 'monday', 'saturday'] },
        },
        listOptions,
      );

      expect(payload.recurrence).toEqual({ frequency: 'weekly', interval: 1, daysOfWeek: [1, 2, 7] });
    });

    it('should drop the Repeat line from the notes when the repeat applies', () => {
      const payload = toReminderPayload(
        {
          ...timedReminder,
          notes: 'Window seat',
          recurrence: 'every 2 days',
          recurrenceRule: { frequency: 'daily', interval: 2 },
        },
        listOptions,
      );

      expect(payload.notes).toBe('Window seat');
      expect(payload.recurrence).toEqual({ frequency: 'daily', interval: 2 });
    });

    it('should keep the repeat in notes when there is no due date', () => {
      const payload = toReminderPayload(
        {
          title: 'Stretch',
          allDay: false,
          notes: 'Ten minutes',
          recurrence: 'every day',
          recurrenceRule: { frequency: 'daily', interval: 1 },
        },
        listOptions,
      );

      expect(payload).toEqual({
        title: 'Stretch',
        listName: 'Home',
        notes: 'Ten minutes\n\nRepeat: every day',
        alarmAtDue: false,
      });
    });

    it('should keep the repeat in notes when the model gave no rule', () => {
      const payload = toReminderPayload({ ...timedReminder, recurrence: 'every day' }, listOptions);

      expect(payload.notes).toBe('Repeat: every day');
      expect(payload.recurrence).toBeUndefined();
    });

    it('should end a repeat after a count of occurrences', () => {
      const payload = toReminderPayload(
        {
          ...timedReminder,
          recurrence: 'every day, 5 times',
          recurrenceRule: { frequency: 'daily', interval: 1, end: { count: 5 } },
        },
        listOptions,
      );

      expect(payload.recurrence?.end).toEqual({ count: 5 });
    });

    /** The day is read as written, so an offset or a Z never moves the end to the day before or after. */
    it.each([
      '2026-12-31',
      '2026-12-31T08:00:00',
      '2026-12-31T00:00:00Z',
      '2026-12-31T23:59:59Z',
      '2026-12-31T23:59:00+09:00',
    ])('should end the repeat at the last second of the local day written in %s, keeping that day', (until) => {
      const payload = toReminderPayload(
        {
          ...timedReminder,
          recurrence: 'every Thursday until the end of the year',
          recurrenceRule: { frequency: 'weekly', interval: 1, daysOfWeek: ['thursday'], end: { until } },
        },
        listOptions,
      );

      expect(payload.recurrence?.end).toEqual({ until: new Date(2026, 11, 31, 23, 59, 59).toISOString() });
    });

    it('should drop an unparseable until instead of failing the reminder', () => {
      const payload = toReminderPayload(
        {
          ...timedReminder,
          recurrence: 'every Thursday until the end of the year',
          recurrenceRule: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: ['thursday'],
            end: { until: 'end of the year' },
          },
        },
        listOptions,
      );

      expect(payload.recurrence).toEqual({ frequency: 'weekly', interval: 1, daysOfWeek: [5] });
    });
  });
});
