import type { ReminderPayload, WriteResult } from '../../models/eventkit.schema';
import { toJxaScript } from './jxa-script.util';
import type {
  EKCalendar,
  EKEventStore,
  EKRecurrenceDayOfWeek,
  EKRecurrenceEnd,
  EKRecurrenceRule,
  NSArray,
  NSDate,
  NSDateComponents,
  NSError,
  NSString,
  ObjCBridge,
  ObjCGlobal,
  ObjCInteger,
  ObjCRef,
} from './objc-bridge.model';

type ReminderDue = NonNullable<ReminderPayload['due']>;
type ReminderRecurrence = NonNullable<ReminderPayload['recurrence']>;

declare const ObjC: ObjCGlobal;
declare const $: ObjCBridge;
declare function Ref<T>(): ObjCRef<T>;

/**
 * A timed reminder gets an absolute alarm at its due time and an all-day one gets none, matching the
 * AppleScript path's `remind me date` and `allday due date`. The days are wrapped in `$()` because the
 * bridge hands a bare JS array's objects to ObjC as dictionaries, which the rule initializer rejects.
 */
function saveReminder([input]: [string]): string {
  ObjC.import('EventKit');
  ObjC.import('Foundation');

  const FREQUENCIES: Record<ReminderRecurrence['frequency'], ObjCInteger> = {
    daily: $.EKRecurrenceFrequencyDaily,
    weekly: $.EKRecurrenceFrequencyWeekly,
    monthly: $.EKRecurrenceFrequencyMonthly,
    yearly: $.EKRecurrenceFrequencyYearly,
  };

  function toText(value: NSString): string {
    return value.isNil() ? '' : ObjC.unwrap(value);
  }

  function toDate(iso: string): NSDate {
    return $.NSDate.dateWithTimeIntervalSince1970(new Date(iso).getTime() / 1000);
  }

  function toErrorText(ref: ObjCRef<NSError>): string {
    return ref[0] && !ref[0].isNil() ? ObjC.unwrap(ref[0].localizedDescription) : 'unknown error';
  }

  function findList(store: EKEventStore, name: string | undefined): EKCalendar {
    if (!name) {
      return store.defaultCalendarForNewReminders;
    }

    const lists = store.calendarsForEntityType($.EKEntityTypeReminder);
    for (let i = 0; i < Number(lists.count); i++) {
      const list = lists.objectAtIndex(i);
      if (list.allowsContentModifications === true && toText(list.title) === name) {
        return list;
      }
    }

    return $();
  }

  function toDueComponents(due: ReminderDue): NSDateComponents {
    const components = $.NSDateComponents.alloc.init;
    components.year = due.year;
    components.month = due.month;
    components.day = due.day;
    if (due.hour !== undefined) {
      components.hour = due.hour;
      components.minute = due.minute || 0;
    }

    return components;
  }

  function toRecurrenceEnd(end: ReminderRecurrence['end']): EKRecurrenceEnd {
    if (!end) {
      return $();
    }

    if ('count' in end) {
      return $.EKRecurrenceEnd.recurrenceEndWithOccurrenceCount(end.count);
    }

    return $.EKRecurrenceEnd.recurrenceEndWithEndDate(toDate(end.until));
  }

  function toRecurrenceRule(recurrence: ReminderRecurrence): EKRecurrenceRule {
    const days: NSArray<EKRecurrenceDayOfWeek> = recurrence.daysOfWeek
      ? $(recurrence.daysOfWeek.map((day) => $.EKRecurrenceDayOfWeek.dayOfWeek(day)))
      : $();

    return $.EKRecurrenceRule.alloc.initRecurrenceWithFrequencyIntervalDaysOfTheWeekDaysOfTheMonthMonthsOfTheYearWeeksOfTheYearDaysOfTheYearSetPositionsEnd(
      FREQUENCIES[recurrence.frequency],
      recurrence.interval,
      days,
      $(),
      $(),
      $(),
      $(),
      $(),
      toRecurrenceEnd(recurrence.end),
    );
  }

  const payload: ReminderPayload = JSON.parse(input);
  const store = $.EKEventStore.alloc.init;
  const list = findList(store, payload.listName);
  if (list.isNil()) {
    return JSON.stringify({
      ok: false,
      error: 'list-not-found',
      detail: payload.listName || '',
    } satisfies WriteResult);
  }

  const reminder = $.EKReminder.reminderWithEventStore(store);
  reminder.title = payload.title;
  reminder.calendar = list;
  if (payload.notes) {
    reminder.notes = payload.notes;
  }
  if (payload.due) {
    const due = toDueComponents(payload.due);
    reminder.dueDateComponents = due;
    if (payload.alarmAtDue) {
      reminder.addAlarm($.EKAlarm.alarmWithAbsoluteDate($.NSCalendar.currentCalendar.dateFromComponents(due)));
    }
  }
  if (payload.recurrence) {
    reminder.addRecurrenceRule(toRecurrenceRule(payload.recurrence));
  }

  const saveRef = Ref<NSError>();
  if (!store.saveReminderCommitError(reminder, true, saveRef)) {
    return JSON.stringify({ ok: false, error: 'save-failed', detail: toErrorText(saveRef) } satisfies WriteResult);
  }

  return JSON.stringify({ ok: true, id: toText(reminder.calendarItemIdentifier) } satisfies WriteResult);
}

export const CREATE_REMINDER_JXA = toJxaScript(saveReminder);
