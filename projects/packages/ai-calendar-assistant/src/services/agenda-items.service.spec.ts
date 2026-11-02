import { describe, expect, it } from 'vitest';
import { AccessRoute, CalendarEntity } from '../models/access-status.enum';
import type { Agenda, AgendaEvent, AgendaReminder } from '../models/eventkit.schema';
import { toAgendaItems } from './agenda-items.service';

/** Monday, local time: every fixture is relative to it. */
const NOW = new Date('2026-11-02T10:00:00');

function buildEvent(overrides: Partial<AgendaEvent>): AgendaEvent {
  return {
    id: 'evt-1',
    title: 'Standup',
    calendar: 'Work',
    allDay: false,
    start: new Date('2026-11-02T09:30:00'),
    end: new Date('2026-11-02T10:00:00'),
    startLabel: '09:30',
    endLabel: '10:00',
    ...overrides,
  };
}

function buildReminder(overrides: Partial<AgendaReminder>): AgendaReminder {
  return {
    id: 'rem-1',
    title: 'Pay rent',
    list: 'Home',
    due: new Date('2026-11-02T18:00:00'),
    hasTime: true,
    timeLabel: '18:00',
    weekdayLabel: 'Monday',
    dateLabel: 'Nov 2',
    ...overrides,
  };
}

function load(agenda: Partial<Agenda>, issues: Parameters<typeof toAgendaItems>[0]['issues'] = []) {
  return toAgendaItems({ agenda: { events: [], reminders: [], ...agenda }, issues }, NOW);
}

describe('agenda-items.service', () => {
  describe('toAgendaItems', () => {
    it('should put all-day events first, then timed events by start', () => {
      const items = load({
        events: [
          buildEvent({
            id: 'late',
            title: 'Late',
            start: new Date('2026-11-02T15:00:00'),
            end: new Date('2026-11-02T16:00:00'),
          }),
          buildEvent({ id: 'allday', title: 'Holiday', allDay: true, start: new Date('2026-11-02T00:00:00') }),
          buildEvent({
            id: 'early',
            title: 'Early',
            start: new Date('2026-11-02T11:00:00'),
            end: new Date('2026-11-02T12:00:00'),
          }),
        ],
      });

      expect(items.map((item) => item.title)).toEqual(['Holiday', 'Early', 'Late']);
    });

    it('should keep an all-day event that started yesterday among the all-day rows', () => {
      const items = load({
        events: [
          buildEvent({
            id: 'timed',
            title: 'Timed',
            start: new Date('2026-11-02T08:00:00'),
            end: new Date('2026-11-02T09:00:00'),
          }),
          buildEvent({
            id: 'trip',
            title: 'Trip',
            allDay: true,
            start: new Date('2026-11-01T00:00:00'),
            end: new Date('2026-11-03T00:00:00'),
          }),
        ],
      });

      expect(items.map((item) => item.title)).toEqual(['Trip', 'Timed']);
      expect(items[0]?.subtitle).toBe('All day · Work');
    });

    it('should mark an overnight event that is still running with Now', () => {
      const now = new Date('2026-11-02T00:30:00');
      const items = toAgendaItems(
        {
          agenda: {
            events: [
              buildEvent({
                start: new Date('2026-11-01T23:00:00'),
                end: new Date('2026-11-02T01:00:00'),
                startLabel: '23:00',
                endLabel: '01:00',
                location: 'HQ',
              }),
            ],
            reminders: [],
          },
          issues: [],
        },
        now,
      );

      expect(items[0]?.subtitle).toBe('Now · 23:00 - 01:00 · Work · HQ');
    });

    it('should not mark an event that ended exactly now', () => {
      const items = load({ events: [buildEvent({ end: NOW })] });

      expect(items[0]?.subtitle).toBe('09:30 - 10:00 · Work');
    });

    it('should make each row uid unique per occurrence of a recurring event', () => {
      const items = load({
        events: [
          buildEvent({ start: new Date('2026-11-02T11:00:00'), end: new Date('2026-11-02T11:30:00') }),
          buildEvent({ start: new Date('2026-11-02T15:00:00'), end: new Date('2026-11-02T15:30:00') }),
        ],
      });

      expect(items[0]?.uid).not.toBe(items[1]?.uid);
      expect(items[0]?.uid).toBe(`evt-1:${new Date('2026-11-02T11:00:00').toISOString()}`);
      expect(JSON.parse(items[0]?.arg as string)).toEqual({ kind: 'open-event', id: 'evt-1' });
    });

    it('should label an all-day reminder due today as Due today, never with a time', () => {
      const items = load({
        reminders: [buildReminder({ due: new Date('2026-11-02T00:00:00'), hasTime: false, timeLabel: '00:00' })],
      });

      expect(items[0]?.subtitle).toBe('Due today · Home');
    });

    it('should label an all-day reminder due yesterday as Overdue since <weekday>', () => {
      const items = load({
        reminders: [
          buildReminder({
            due: new Date('2026-11-01T00:00:00'),
            hasTime: false,
            weekdayLabel: 'Sunday',
            dateLabel: 'Nov 1',
          }),
        ],
      });

      expect(items[0]?.subtitle).toBe('Overdue since Sunday · Home');
    });

    it('should keep a timed reminder whose time passed today among the due-today rows', () => {
      const items = load({
        reminders: [
          buildReminder({ id: 'a', title: 'Later', due: new Date('2026-11-02T18:00:00') }),
          buildReminder({ id: 'b', title: 'Passed', due: new Date('2026-11-02T08:00:00'), timeLabel: '08:00' }),
          buildReminder({ id: 'c', title: 'Yesterday', due: new Date('2026-11-01T08:00:00') }),
        ],
      });

      expect(items.map((item) => item.title)).toEqual(['Yesterday', 'Passed', 'Later']);
      expect(items[1]?.subtitle).toBe('Due 08:00 · Home');
    });

    it('should use the weekday label for a reminder due 6 calendar days back', () => {
      const items = load({
        reminders: [
          buildReminder({ due: new Date('2026-10-27T09:00:00'), weekdayLabel: 'Tuesday', dateLabel: 'Oct 27' }),
        ],
      });

      expect(items[0]?.subtitle).toBe('Overdue since Tuesday · Home');
    });

    it('should use the date label for a reminder due 7 calendar days back', () => {
      const items = load({
        reminders: [
          buildReminder({ due: new Date('2026-10-26T23:00:00'), weekdayLabel: 'Monday', dateLabel: 'Oct 26' }),
        ],
      });

      expect(items[0]?.subtitle).toBe('Overdue since Oct 26 · Home');
    });

    it('should order overdue reminders oldest first, before reminders due today by time', () => {
      const items = load({
        reminders: [
          buildReminder({ id: 'b', title: 'Later today', due: new Date('2026-11-02T20:00:00') }),
          buildReminder({ id: 'a', title: 'Earlier today', due: new Date('2026-11-02T12:00:00'), timeLabel: '12:00' }),
          buildReminder({ id: 'c', title: 'Newer overdue', due: new Date('2026-11-01T09:00:00') }),
          buildReminder({ id: 'd', title: 'Older overdue', due: new Date('2026-10-30T09:00:00') }),
        ],
      });

      expect(items.map((item) => item.title)).toEqual([
        'Older overdue',
        'Newer overdue',
        'Earlier today',
        'Later today',
      ]);
      expect(items[2]?.subtitle).toBe('Due 12:00 · Home');
      expect(JSON.parse(items[2]?.arg as string)).toEqual({ kind: 'show-list', list: 'Home' });
    });

    it('should show events plus one reminders access row when only events are granted', () => {
      const items = load({ events: [buildEvent({})] }, [
        { kind: 'needs-access', entity: CalendarEntity.Reminder, route: AccessRoute.Request },
      ]);

      expect(items.map((item) => item.title)).toEqual(['Allow Alfred to read your reminders', 'Standup']);
      expect(items[0]?.valid).not.toBe(false);
    });

    it('should show Nothing on your calendar today for an empty day', () => {
      const items = load({});

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ title: 'Nothing on your calendar today', valid: false });
    });

    it('should match an event row on its title and calendar, and a reminder row on its title and list', () => {
      const items = load({
        events: [buildEvent({ title: 'Standup', calendar: 'Work' })],
        reminders: [buildReminder({ title: 'Pay rent', list: 'Home' })],
      });

      expect(items.map((item) => item.match)).toEqual(['Standup Work', 'Pay rent Home']);
    });

    it('should encode each row action as JSON in arg', () => {
      const items = load({}, [
        { kind: 'needs-access', entity: CalendarEntity.Event, route: AccessRoute.Request },
        { kind: 'needs-access', entity: CalendarEntity.Reminder, route: AccessRoute.Settings },
        { kind: 'failed', reason: 'boom' },
      ]);

      expect(JSON.parse(items[0]?.arg as string)).toEqual({ kind: 'request-access', entity: 'event' });
      expect(items[0]?.title).toBe('Allow Alfred to read your calendars');
      expect(JSON.parse(items[1]?.arg as string)).toEqual({ kind: 'open-settings', entity: 'reminder' });
      expect(items[1]?.subtitle).toBe('System Settings › Privacy & Security › Reminders › Alfred');
      expect(items[2]).toMatchObject({ subtitle: 'boom', valid: false, text: { copy: 'boom', largetype: 'boom' } });
    });
  });
});
