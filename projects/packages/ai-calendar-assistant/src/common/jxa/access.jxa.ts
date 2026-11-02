import type { CalendarEntity } from '../../models/access-status.enum';
import { toJxaScript } from './jxa-script.util';
import type { ObjCBridge, ObjCGlobal, ObjCInteger } from './objc-bridge.model';

type AccessInput = { mode: 'read' } | { mode: 'request'; entity: CalendarEntity };

declare const ObjC: ObjCGlobal;
declare const $: ObjCBridge;

/** The request's completion block never runs under osascript, so the status is polled while the run loop spins. */
function getAccess([input]: [string]): string {
  ObjC.import('EventKit');
  ObjC.import('Foundation');

  const REQUEST_TIMEOUT_MS = 60000;
  const NOT_DETERMINED = 0;

  function toEntityType(entity: CalendarEntity): ObjCInteger {
    return entity === 'reminder' ? $.EKEntityTypeReminder : $.EKEntityTypeEvent;
  }

  function readStatus(type: ObjCInteger): number {
    return Number($.EKEventStore.authorizationStatusForEntityType(type));
  }

  function requestStatus(entity: CalendarEntity): number {
    const type = toEntityType(entity);
    if (readStatus(type) !== NOT_DETERMINED) {
      return readStatus(type);
    }

    const store = $.EKEventStore.alloc.init;
    const method =
      entity === 'reminder' ? 'requestFullAccessToRemindersWithCompletion' : 'requestFullAccessToEventsWithCompletion';
    if (typeof store[method] === 'function') {
      store[method](() => undefined);
    } else {
      store.requestAccessToEntityTypeCompletion(type, () => undefined);
    }

    const deadline = Date.now() + REQUEST_TIMEOUT_MS;
    while (readStatus(type) === NOT_DETERMINED && Date.now() < deadline) {
      $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.05));
    }

    return readStatus(type);
  }

  const access: AccessInput = JSON.parse(input);
  if (access.mode === 'request') {
    return JSON.stringify(requestStatus(access.entity));
  }

  return JSON.stringify({ event: readStatus($.EKEntityTypeEvent), reminder: readStatus($.EKEntityTypeReminder) });
}

export const ACCESS_JXA = toJxaScript(getAccess);
