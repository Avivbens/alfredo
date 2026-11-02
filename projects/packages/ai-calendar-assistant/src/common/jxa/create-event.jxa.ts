import type { EventPayload, WriteResult } from '../../models/eventkit.schema';
import { toJxaScript } from './jxa-script.util';
import type {
  EKCalendar,
  EKEventStore,
  NSDate,
  NSError,
  NSString,
  NSTimeZone,
  NSURL,
  ObjCBridge,
  ObjCGlobal,
  ObjCRef,
} from './objc-bridge.model';

declare const ObjC: ObjCGlobal;
declare const $: ObjCBridge;
declare function Ref<T>(): ObjCRef<T>;

/**
 * An unknown zone name makes NSTimeZone return nil, and a nil zone would leave a timed event floating,
 * so it falls back to the system zone. All-day events never get a zone, so they float as EventKit expects.
 * NSURL returns nil for an unencoded URL, so that URL goes into the notes instead of being dropped.
 */
function saveEvent([input]: [string]): string {
  ObjC.import('EventKit');
  ObjC.import('Foundation');

  function toText(value: NSString): string {
    return value.isNil() ? '' : ObjC.unwrap(value);
  }

  function toDate(iso: string): NSDate {
    return $.NSDate.dateWithTimeIntervalSince1970(new Date(iso).getTime() / 1000);
  }

  function toTimeZone(name: string | undefined): NSTimeZone {
    const zone: NSTimeZone = name ? $.NSTimeZone.timeZoneWithName(name) : $();
    return zone.isNil() ? $.NSTimeZone.systemTimeZone : zone;
  }

  function toErrorText(ref: ObjCRef<NSError>): string {
    return ref[0] && !ref[0].isNil() ? ObjC.unwrap(ref[0].localizedDescription) : 'unknown error';
  }

  function findCalendar(store: EKEventStore, name: string): EKCalendar {
    if (!name) {
      return store.defaultCalendarForNewEvents;
    }

    const calendars = store.calendarsForEntityType($.EKEntityTypeEvent);
    for (let i = 0; i < Number(calendars.count); i++) {
      const calendar = calendars.objectAtIndex(i);
      if (calendar.allowsContentModifications === true && toText(calendar.title) === name) {
        return calendar;
      }
    }

    return $();
  }

  const payload: EventPayload = JSON.parse(input);
  const store = $.EKEventStore.alloc.init;
  const calendar = findCalendar(store, payload.calendarName);
  if (calendar.isNil()) {
    return JSON.stringify({
      ok: false,
      error: 'calendar-not-found',
      detail: payload.calendarName,
    } satisfies WriteResult);
  }

  const event = $.EKEvent.eventWithEventStore(store);
  event.title = payload.title;
  event.calendar = calendar;
  event.allDay = payload.allDay;
  if (!payload.allDay) {
    event.timeZone = toTimeZone(payload.timeZone);
  }
  event.startDate = toDate(payload.start);
  event.endDate = toDate(payload.end);
  if (payload.location) {
    event.location = payload.location;
  }
  const url: NSURL = payload.url ? $.NSURL.URLWithString(payload.url) : $();
  const notes = [payload.notes, url.isNil() ? payload.url : undefined].filter(Boolean).join('\n');
  if (notes) {
    event.notes = notes;
  }
  if (!url.isNil()) {
    event.URL = url;
  }
  if (payload.alertMinutes) {
    event.addAlarm($.EKAlarm.alarmWithRelativeOffset(-payload.alertMinutes * 60));
  }

  const saveRef = Ref<NSError>();
  if (!store.saveEventSpanCommitError(event, $.EKSpanThisEvent, true, saveRef)) {
    return JSON.stringify({ ok: false, error: 'save-failed', detail: toErrorText(saveRef) } satisfies WriteResult);
  }

  return JSON.stringify({ ok: true, id: toText(event.eventIdentifier) } satisfies WriteResult);
}

export const CREATE_EVENT_JXA = toJxaScript(saveEvent);
