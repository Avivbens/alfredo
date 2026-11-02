import type { z } from 'zod';
import type { agendaEventSchema, agendaReminderSchema } from '../../models/eventkit.schema';
import { toJxaScript } from './jxa-script.util';
import type {
  EKCalendar,
  EKEventStore,
  EKReminder,
  NSArray,
  NSCalendar,
  NSDate,
  NSDateFormatter,
  NSMutableArray,
  NSString,
  ObjCBridge,
  ObjCGlobal,
} from './objc-bridge.model';

export type AgendaInput = { calendars: string[]; includeReminders: boolean };

declare const ObjC: ObjCGlobal;
declare const $: ObjCBridge;

/**
 * Labels are formatted here because Alfred's Node often lacks the system locale and its 12 or 24 hour setting.
 * EventKit doesn't document the reminder fetch's end bound as exclusive, and an all-day reminder due tomorrow
 * lands right on it, so anything due at or after the day's end is dropped.
 */
function readTodayAgenda([input]: [string]): string {
  ObjC.import('EventKit');
  ObjC.import('Foundation');

  const FETCH_TIMEOUT_MS = 15000;

  function toText(value: NSString): string {
    return value.isNil() ? '' : ObjC.unwrap(value);
  }

  function toIso(date: NSDate): string {
    return ObjC.unwrap(date).toISOString();
  }

  function createTimeFormatter(): NSDateFormatter {
    const formatter = $.NSDateFormatter.alloc.init;
    formatter.timeStyle = $.NSDateFormatterShortStyle;
    formatter.dateStyle = $.NSDateFormatterNoStyle;
    return formatter;
  }

  function createTemplateFormatter(template: string): NSDateFormatter {
    const formatter = $.NSDateFormatter.alloc.init;
    formatter.setLocalizedDateFormatFromTemplate(template);
    return formatter;
  }

  function format(formatter: NSDateFormatter, date: NSDate): string {
    return ObjC.unwrap(formatter.stringFromDate(date));
  }

  function selectCalendars(store: EKEventStore, titles: string[]): NSMutableArray<EKCalendar> {
    const calendars = store.calendarsForEntityType($.EKEntityTypeEvent);
    const selected: NSMutableArray<EKCalendar> = $.NSMutableArray.array;
    for (let i = 0; i < Number(calendars.count); i++) {
      const calendar = calendars.objectAtIndex(i);
      if (titles.includes(toText(calendar.title))) {
        selected.addObject(calendar);
      }
    }

    return selected;
  }

  function readEvents(
    store: EKEventStore,
    dayStart: NSDate,
    dayEnd: NSDate,
    titles: string[],
    timeFormatter: NSDateFormatter,
  ): z.input<typeof agendaEventSchema>[] {
    const calendars: NSArray<EKCalendar> = titles.length === 0 ? $() : selectCalendars(store, titles);
    if (!calendars.isNil() && Number(calendars.count) === 0) {
      return [];
    }

    const events = store.eventsMatchingPredicate(
      store.predicateForEventsWithStartDateEndDateCalendars(dayStart, dayEnd, calendars),
    );
    const items: z.input<typeof agendaEventSchema>[] = [];
    for (let i = 0; i < Number(events.count); i++) {
      const event = events.objectAtIndex(i);
      items.push({
        id: toText(event.eventIdentifier),
        title: toText(event.title),
        calendar: toText(event.calendar.title),
        location: toText(event.location) || undefined,
        allDay: event.allDay === true,
        start: toIso(event.startDate),
        end: toIso(event.endDate),
        startLabel: format(timeFormatter, event.startDate),
        endLabel: format(timeFormatter, event.endDate),
      });
    }

    return items;
  }

  function fetchReminders(store: EKEventStore, dayEnd: NSDate): NSArray<EKReminder> {
    const predicate = store.predicateForIncompleteRemindersWithDueDateStartingEndingCalendars($(), dayEnd, $());
    const fetch = { done: false, reminders: $<NSArray<EKReminder>>() };
    store.fetchRemindersMatchingPredicateCompletion(predicate, (reminders) => {
      fetch.reminders = reminders;
      fetch.done = true;
    });

    const deadline = Date.now() + FETCH_TIMEOUT_MS;
    while (!fetch.done && Date.now() < deadline) {
      $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.02));
    }

    if (!fetch.done) {
      throw new Error('Timed out reading reminders');
    }

    return fetch.reminders;
  }

  function readReminders(
    store: EKEventStore,
    systemCalendar: NSCalendar,
    dayEnd: NSDate,
    timeFormatter: NSDateFormatter,
  ): z.input<typeof agendaReminderSchema>[] {
    const reminders = fetchReminders(store, dayEnd);
    if (!reminders || reminders.isNil()) {
      return [];
    }

    const weekdayFormatter = createTemplateFormatter('EEE');
    const dateFormatter = createTemplateFormatter('MMMd');
    const items: z.input<typeof agendaReminderSchema>[] = [];
    for (let i = 0; i < Number(reminders.count); i++) {
      const reminder = reminders.objectAtIndex(i);
      const components = reminder.dueDateComponents;
      if (components.isNil()) {
        continue;
      }

      const due = systemCalendar.dateFromComponents(components);
      if (due.isNil()) {
        continue;
      }

      if (ObjC.unwrap(due).getTime() >= ObjC.unwrap(dayEnd).getTime()) {
        continue;
      }

      items.push({
        id: toText(reminder.calendarItemIdentifier),
        title: toText(reminder.title),
        list: toText(reminder.calendar.title),
        due: toIso(due),
        hasTime: Number(components.hour) !== Number($.NSDateComponentUndefined),
        timeLabel: format(timeFormatter, due),
        weekdayLabel: format(weekdayFormatter, due),
        dateLabel: format(dateFormatter, due),
      });
    }

    return items;
  }

  const options: AgendaInput = JSON.parse(input);
  const store = $.EKEventStore.alloc.init;
  const systemCalendar = $.NSCalendar.currentCalendar;
  const dayStart = systemCalendar.startOfDayForDate($.NSDate.date);
  const dayEnd = systemCalendar.dateByAddingUnitValueToDateOptions($.NSCalendarUnitDay, 1, dayStart, 0);
  const timeFormatter = createTimeFormatter();

  const events = readEvents(store, dayStart, dayEnd, options.calendars, timeFormatter);
  const reminders = options.includeReminders ? readReminders(store, systemCalendar, dayEnd, timeFormatter) : [];

  return JSON.stringify({ events, reminders });
}

export const AGENDA_JXA = toJxaScript(readTodayAgenda);
