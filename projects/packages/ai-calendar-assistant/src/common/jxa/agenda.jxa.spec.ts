import { describe, expect, it } from 'vitest';
import { AGENDA_JXA } from './agenda.jxa';

type Bridged = { isNil: () => boolean; value?: unknown };
type FakeComponents = Bridged & { year: number; month: number; day: number; hour: number; minute?: number };
type FakeReminder = { title: string; components: FakeComponents };

/** NSDateComponentUndefined is NSIntegerMax, and the bridge hands constants over as strings. */
const UNDEFINED_COMPONENT = '9223372036854775807';

const NOW = new Date(2026, 10, 2, 10, 30);

function toBridged(value: unknown): Bridged {
  return { isNil: () => false, value };
}

function toNil(): Bridged {
  return { isNil: () => true };
}

function toComponents(day: number, hour = Number(UNDEFINED_COMPONENT)): FakeComponents {
  return { isNil: () => false, year: 2026, month: 11, day, hour };
}

function toArray(items: unknown[]): Bridged & { count: number; objectAtIndex: (index: number) => unknown } {
  return { isNil: () => false, count: items.length, objectAtIndex: (index: number) => items[index] };
}

/**
 * Runs the real script source against a fake ObjC bridge, so its branches are exercised without
 * touching EventKit. Only the members the script uses are faked, and the fetch hands back every
 * reminder as is, as if EventKit included its end bound.
 */
function runAgenda(reminders: FakeReminder[]): { events: unknown[]; reminders: { title: string }[] } {
  const store = {
    calendarsForEntityType: () => toArray([]),
    predicateForEventsWithStartDateEndDateCalendars: () => toBridged('events'),
    eventsMatchingPredicate: () => toArray([]),
    predicateForIncompleteRemindersWithDueDateStartingEndingCalendars: () => toBridged('reminders'),
    fetchRemindersMatchingPredicateCompletion: (_predicate: unknown, complete: (fetched: unknown) => void) =>
      complete(
        toArray(
          reminders.map(({ title, components }) => ({
            calendarItemIdentifier: toBridged(title),
            title: toBridged(title),
            calendar: { title: toBridged('Home') },
            dueDateComponents: components,
          })),
        ),
      ),
  };
  const calendar = {
    startOfDayForDate: ({ value }: Bridged) => {
      const day = new Date(value as Date);
      day.setHours(0, 0, 0, 0);
      return toBridged(day);
    },
    dateByAddingUnitValueToDateOptions: (_unit: unknown, days: number, { value }: Bridged) => {
      const date = new Date(value as Date);
      date.setDate(date.getDate() + days);
      return toBridged(date);
    },
    dateFromComponents: ({ year, month, day, hour, minute = 0 }: FakeComponents) =>
      toBridged(new Date(year, month - 1, day, hour === Number(UNDEFINED_COMPONENT) ? 0 : hour, minute)),
  };
  const bridge = Object.assign(() => toNil(), {
    NSDate: { date: toBridged(NOW) },
    NSCalendar: { currentCalendar: calendar },
    NSDateFormatter: {
      alloc: {
        get init(): Record<string, unknown> {
          return {
            setLocalizedDateFormatFromTemplate: () => undefined,
            stringFromDate: ({ value }: Bridged) => toBridged((value as Date).toISOString()),
          };
        },
      },
    },
    EKEventStore: { alloc: { init: store } },
    EKEntityTypeEvent: '0',
    NSCalendarUnitDay: '16',
    NSDateComponentUndefined: UNDEFINED_COMPONENT,
    NSDateFormatterShortStyle: '1',
    NSDateFormatterNoStyle: '0',
  });
  const objC = { import: () => undefined, unwrap: ({ value }: Bridged) => value };
  const run = new Function('ObjC', '$', `${AGENDA_JXA}\nreturn run;`)(objC, bridge);

  return JSON.parse(run([JSON.stringify({ calendars: [], includeReminders: true })]));
}

describe('agenda.jxa', () => {
  describe('AGENDA_JXA', () => {
    it("should leave out an all-day reminder due tomorrow, whose due date is the day's end", () => {
      const { reminders } = runAgenda([{ title: 'Renew passport', components: toComponents(3) }]);

      expect(reminders).toEqual([]);
    });

    it('should keep overdue reminders and those due any time today', () => {
      const { reminders } = runAgenda([
        { title: 'Pay rent', components: toComponents(1, 9) },
        { title: 'Call the bank', components: toComponents(2) },
        { title: 'Water the plants', components: toComponents(2, 23) },
      ]);

      expect(reminders.map(({ title }) => title)).toEqual(['Pay rent', 'Call the bank', 'Water the plants']);
    });

    it('should reach nothing outside the handler, since osascript runs it from its source alone', () => {
      expect(AGENDA_JXA).not.toMatch(/__name\(|__vi_|__vite_ssr|\brequire\(|(?<!ObjC\.)\bimport\b/);
    });
  });
});
