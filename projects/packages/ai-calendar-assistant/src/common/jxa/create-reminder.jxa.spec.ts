import { describe, expect, it } from 'vitest';
import type { ReminderPayload } from '../../models/eventkit.schema';
import { CREATE_REMINDER_JXA } from './create-reminder.jxa';

type Bridged = { isNil: () => boolean; value?: unknown };
type FakeList = Bridged & { title: Bridged; allowsContentModifications: boolean };
type FakeReminder = Record<string, unknown>;
type FakeRule = { frequency: unknown; interval: unknown; days: unknown; end: unknown };
type FakeComponents = { year: number; month: number; day: number; hour?: number; minute?: number };
type FakeStore = { lists?: FakeList[]; defaultList?: Bridged; saveError?: string };

const payload: ReminderPayload = { title: 'Call the bank', listName: 'Home', alarmAtDue: false };

function toBridged(value: unknown): Bridged {
  return { isNil: () => false, value };
}

function toNil(): Bridged {
  return { isNil: () => true };
}

/**
 * `$(array)` is how JXA makes an NSArray, while a bare JS array reaches ObjC as dictionaries, so the fake
 * tells the two apart.
 */
function toBridgeValue(value?: unknown): Bridged | { nsArray: unknown[] } {
  return Array.isArray(value) ? { nsArray: value } : toNil();
}

function toList(title: string, allowsContentModifications = true): FakeList {
  return { ...toBridged(title), title: toBridged(title), allowsContentModifications };
}

/**
 * Runs the real script source against a fake ObjC bridge, so its branches are exercised without
 * touching EventKit. Only the members the script uses are faked.
 */
function runCreateReminder(
  input: ReminderPayload,
  { lists = [toList('Home'), toList('Shared', false)], defaultList = lists[0], saveError }: FakeStore = {},
): { output: unknown; reminder: FakeReminder; alarms: unknown[]; rules: FakeRule[]; saved: boolean } {
  const alarms: unknown[] = [];
  const rules: FakeRule[] = [];
  const reminder: FakeReminder = {
    addAlarm: (alarm: unknown) => alarms.push(alarm),
    addRecurrenceRule: (rule: FakeRule) => rules.push(rule),
  };
  let saved = false;
  const store = {
    defaultCalendarForNewReminders: defaultList ?? toNil(),
    calendarsForEntityType: () => ({ count: lists.length, objectAtIndex: (index: number) => lists[index] }),
    saveReminderCommitError: (_reminder: unknown, _commit: boolean, ref: unknown[]) => {
      if (saveError) {
        ref[0] = { isNil: () => false, localizedDescription: toBridged(saveError) };
        return false;
      }

      saved = true;
      reminder.calendarItemIdentifier = toBridged('REMINDER-1');
      return true;
    },
  };
  const bridge = Object.assign((value?: unknown) => toBridgeValue(value), {
    NSDate: { dateWithTimeIntervalSince1970: (seconds: number) => toBridged(new Date(seconds * 1000)) },
    NSDateComponents: {
      alloc: {
        get init(): Record<string, unknown> {
          return {};
        },
      },
    },
    NSCalendar: {
      currentCalendar: {
        dateFromComponents: ({ year, month, day, hour = 0, minute = 0 }: FakeComponents) =>
          toBridged(new Date(year, month - 1, day, hour, minute)),
      },
    },
    EKEventStore: { alloc: { init: store } },
    EKReminder: { reminderWithEventStore: () => reminder },
    EKAlarm: { alarmWithAbsoluteDate: ({ value }: Bridged) => ({ absoluteDate: value }) },
    EKRecurrenceDayOfWeek: { dayOfWeek: (day: number) => ({ dayOfWeek: day }) },
    EKRecurrenceEnd: {
      recurrenceEndWithOccurrenceCount: (count: number) => ({ count }),
      recurrenceEndWithEndDate: ({ value }: Bridged) => ({ endDate: value }),
    },
    EKRecurrenceRule: {
      alloc: {
        initRecurrenceWithFrequencyIntervalDaysOfTheWeekDaysOfTheMonthMonthsOfTheYearWeeksOfTheYearDaysOfTheYearSetPositionsEnd:
          (frequency: unknown, interval: unknown, days: unknown, ...rest: unknown[]) => ({
            frequency,
            interval,
            days,
            end: rest[5],
          }),
      },
    },
    EKRecurrenceFrequencyDaily: 0,
    EKRecurrenceFrequencyWeekly: 1,
    EKRecurrenceFrequencyMonthly: 2,
    EKRecurrenceFrequencyYearly: 3,
    EKEntityTypeReminder: 1,
  });
  const objC = { import: () => undefined, unwrap: ({ value }: Bridged) => value };
  const run = new Function('ObjC', '$', 'Ref', `${CREATE_REMINDER_JXA}\nreturn run;`)(objC, bridge, () => []);

  return { output: JSON.parse(run([JSON.stringify(input)])), reminder, alarms, rules, saved };
}

describe('create-reminder.jxa', () => {
  describe('CREATE_REMINDER_JXA', () => {
    it('should give an all-day reminder date-only due components and no alarm', () => {
      const { output, reminder, alarms } = runCreateReminder({ ...payload, due: { year: 2026, month: 11, day: 3 } });

      expect(output).toEqual({ ok: true, id: 'REMINDER-1' });
      expect(reminder.dueDateComponents).toEqual({ year: 2026, month: 11, day: 3 });
      expect(alarms).toEqual([]);
    });

    it('should give a timed reminder full due components and an alarm at the due time', () => {
      const { reminder, alarms } = runCreateReminder({
        ...payload,
        due: { year: 2026, month: 11, day: 3, hour: 9, minute: 30 },
        alarmAtDue: true,
      });

      expect(reminder.dueDateComponents).toEqual({ year: 2026, month: 11, day: 3, hour: 9, minute: 30 });
      expect(alarms).toEqual([{ absoluteDate: new Date(2026, 10, 3, 9, 30) }]);
    });

    it('should leave a reminder without a due date undated and without a repeat', () => {
      const { output, reminder, alarms, rules } = runCreateReminder({ ...payload, notes: 'Ask about the fee' });

      expect(output).toEqual({ ok: true, id: 'REMINDER-1' });
      expect(reminder).toMatchObject({ title: 'Call the bank', notes: 'Ask about the fee' });
      expect('dueDateComponents' in reminder).toBe(false);
      expect(alarms).toEqual([]);
      expect(rules).toEqual([]);
    });

    it('should repeat on the given EventKit day-of-week numbers', () => {
      const { rules } = runCreateReminder({
        ...payload,
        due: { year: 2026, month: 11, day: 1, hour: 9, minute: 0 },
        alarmAtDue: true,
        recurrence: { frequency: 'weekly', interval: 2, daysOfWeek: [1, 2] },
      });

      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        frequency: 1,
        interval: 2,
        days: { nsArray: [{ dayOfWeek: 1 }, { dayOfWeek: 2 }] },
      });
      expect((rules[0]?.end as Bridged).isNil()).toBe(true);
    });

    it('should pass no days for a rule without them', () => {
      const { rules } = runCreateReminder({
        ...payload,
        due: { year: 2026, month: 11, day: 3 },
        recurrence: { frequency: 'daily', interval: 1 },
      });

      expect(rules[0]?.frequency).toBe(0);
      expect((rules[0]?.days as Bridged).isNil()).toBe(true);
    });

    it('should end a repeat after a count of occurrences', () => {
      const { rules } = runCreateReminder({
        ...payload,
        due: { year: 2026, month: 11, day: 3 },
        recurrence: { frequency: 'monthly', interval: 1, end: { count: 5 } },
      });

      expect(rules[0]).toMatchObject({ frequency: 2, end: { count: 5 } });
    });

    it('should end a repeat on a date', () => {
      const { rules } = runCreateReminder({
        ...payload,
        due: { year: 2026, month: 11, day: 3 },
        recurrence: { frequency: 'yearly', interval: 1, end: { until: '2030-12-31T21:59:59.000Z' } },
      });

      expect(rules[0]).toMatchObject({ frequency: 3, end: { endDate: new Date('2030-12-31T21:59:59.000Z') } });
    });

    it('should report an unknown list by name without saving', () => {
      const { output, saved } = runCreateReminder({ ...payload, listName: 'Groceries' });

      expect(output).toEqual({ ok: false, error: 'list-not-found', detail: 'Groceries' });
      expect(saved).toBe(false);
    });

    it('should never pick a read-only list, even with the same title', () => {
      const { output } = runCreateReminder({ ...payload, listName: 'Shared' });

      expect(output).toEqual({ ok: false, error: 'list-not-found', detail: 'Shared' });
    });

    it('should use the default list when no list is named', () => {
      const defaultList = toList('Reminders');
      const { output, reminder } = runCreateReminder({ ...payload, listName: undefined }, { defaultList });

      expect(output).toEqual({ ok: true, id: 'REMINDER-1' });
      expect(reminder.calendar).toBe(defaultList);
    });

    it('should report a missing default list with an empty detail', () => {
      const { output } = runCreateReminder({ ...payload, listName: '' }, { defaultList: toNil() });

      expect(output).toEqual({ ok: false, error: 'list-not-found', detail: '' });
    });

    it('should report a failed save with its reason', () => {
      const { output } = runCreateReminder(payload, { saveError: 'Repeating reminders need a due date' });

      expect(output).toEqual({ ok: false, error: 'save-failed', detail: 'Repeating reminders need a due date' });
    });

    it('should reach nothing outside the handler, since osascript runs it from its source alone', () => {
      expect(CREATE_REMINDER_JXA).not.toMatch(/__name\(|__vi_|__vite_ssr|\brequire\(|(?<!ObjC\.)\bimport\b/);
    });
  });
});
