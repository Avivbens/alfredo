import { isAfter, isEqual, startOfDay, subSeconds } from 'date-fns';
import type { CalendarEvent } from '../models/calendar-event.model';
import type { EventPayload, ReminderPayload } from '../models/eventkit.schema';
import type { RecurrenceRule, Reminder } from '../models/reminder.model';

type EventPayloadOptions = Pick<EventPayload, 'calendarName' | 'alertMinutes'> & { systemTimeZone: string };

type ReminderPayloadOptions = Pick<ReminderPayload, 'listName'>;
type ReminderDue = NonNullable<ReminderPayload['due']>;
type ReminderRecurrence = NonNullable<ReminderPayload['recurrence']>;
type Weekday = NonNullable<RecurrenceRule['daysOfWeek']>[number];

const LEADING_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

const EVENTKIT_WEEKDAYS: Record<Weekday, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

function isLocalMidnight(date: Date): boolean {
  return isEqual(startOfDay(date), date);
}

/**
 * EventKit's all-day end is inclusive, so the exclusive next-midnight end Calendar's AppleScript
 * takes would add a day. It is local midnight because all-day events float in the system zone.
 */
function toAllDayEnd(start: Date, end: Date): Date {
  if (isLocalMidnight(end) && isAfter(end, start)) {
    return subSeconds(end, 1);
  }

  return end;
}

/**
 * All-day events float with no zone and no alert, since an alert minutes before midnight is noise.
 * The notes stay the plain description because EventKit stores the zone on the event itself.
 */
export function toEventPayload(event: CalendarEvent, options: EventPayloadOptions): EventPayload {
  const allDay = event.allDayEvent ?? false;
  const end = allDay ? toAllDayEnd(event.startDate, event.endDate) : event.endDate;

  return {
    title: event.summary,
    start: event.startDate.toISOString(),
    end: end.toISOString(),
    allDay,
    calendarName: options.calendarName,
    location: event.location ?? undefined,
    notes: event.description ?? undefined,
    url: event.url ?? undefined,
    timeZone: allDay ? undefined : (event.timeZone ?? options.systemTimeZone),
    alertMinutes: allDay ? undefined : options.alertMinutes,
  };
}

/** A repeat rule needs a due date to repeat from, so without one the repeat stays text in the notes. */
export function isRepeatApplicable(reminder: Reminder): boolean {
  return !!reminder.recurrenceRule && !!reminder.dueDate;
}

function toReminderDue(dueDate: Date, allDay: boolean): ReminderDue {
  const day = { year: dueDate.getFullYear(), month: dueDate.getMonth() + 1, day: dueDate.getDate() };

  return allDay ? day : { ...day, hour: dueDate.getHours(), minute: dueDate.getMinutes() };
}

/**
 * EventKit writes the end date as the rule's UNTIL, which drops any occurrence after it, so the end is the last
 * second of the day. The day is read as written, because converting a time or offset to the local zone can move
 * it a day. A value with no leading date drops the end rather than failing the whole reminder.
 */
function toRecurrenceEnd(end: RecurrenceRule['end']): ReminderRecurrence['end'] {
  if (!end) {
    return undefined;
  }

  if ('count' in end) {
    return { count: end.count };
  }

  const [, year, month, day] = LEADING_DAY_PATTERN.exec(end.until) ?? [];
  if (!year || !month || !day) {
    return undefined;
  }

  return { until: new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59).toISOString() };
}

function toReminderRecurrence(rule: RecurrenceRule): ReminderRecurrence {
  return {
    frequency: rule.frequency,
    interval: rule.interval,
    daysOfWeek: rule.daysOfWeek?.map((day) => EVENTKIT_WEEKDAYS[day]),
    end: toRecurrenceEnd(rule.end),
  };
}

/** The `Repeat:` notes line is the AppleScript path's stand-in for a rule, so it is written only when no rule is. */
export function toReminderPayload(reminder: Reminder, options: ReminderPayloadOptions): ReminderPayload {
  const { title, notes, dueDate, allDay, recurrence, recurrenceRule } = reminder;
  const rule = isRepeatApplicable(reminder) ? recurrenceRule : undefined;
  const repeatLine = recurrence && !rule ? `Repeat: ${recurrence}` : undefined;
  const noteText = [notes, repeatLine].filter((part): part is string => !!part).join('\n\n');

  return {
    title,
    listName: options.listName,
    notes: noteText || undefined,
    due: dueDate ? toReminderDue(dueDate, allDay) : undefined,
    alarmAtDue: !!dueDate && !allDay,
    recurrence: rule ? toReminderRecurrence(rule) : undefined,
  };
}
