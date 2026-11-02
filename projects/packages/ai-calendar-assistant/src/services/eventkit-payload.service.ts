import { isAfter, isEqual, startOfDay, subSeconds } from 'date-fns';
import type { CalendarEvent } from '../models/calendar-event.model';
import type { EventPayload } from '../models/eventkit.schema';

type EventPayloadOptions = Pick<EventPayload, 'calendarName' | 'alertMinutes'> & { systemTimeZone: string };

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
