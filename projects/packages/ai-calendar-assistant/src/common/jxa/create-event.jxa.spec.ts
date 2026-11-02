import { describe, expect, it } from 'vitest';
import type { EventPayload } from '../../models/eventkit.schema';
import { CREATE_EVENT_JXA } from './create-event.jxa';

type Bridged = { isNil: () => boolean; value?: unknown };
type FakeEvent = Record<string, unknown>;

const SYSTEM_ZONE = 'Asia/Jerusalem';
const KNOWN_ZONES = ['America/New_York', SYSTEM_ZONE];

/** NSURL.URLWithString returned nil for this URL through osascript on macOS 26, while it percent-encodes plain spaces. */
const REJECTED_URL = 'http://exa mple.com/a b|c';

const payload: EventPayload = {
  title: 'Standup',
  start: '2026-11-02T14:00:00.000Z',
  end: '2026-11-02T14:30:00.000Z',
  allDay: false,
  calendarName: 'Work',
  notes: 'Daily sync',
  timeZone: 'America/New_York',
};

function toBridged(value: unknown): Bridged {
  return { isNil: () => false, value };
}

function toNil(): Bridged {
  return { isNil: () => true };
}

/**
 * Runs the real script source against a fake ObjC bridge, so its branches are exercised without
 * touching EventKit. Only the members the script uses are faked.
 */
function runCreateEvent(input: EventPayload): { output: unknown; event: FakeEvent; alarms: unknown[] } {
  const alarms: unknown[] = [];
  const event: FakeEvent = { addAlarm: (alarm: unknown) => alarms.push(alarm) };
  const calendar = { isNil: () => false, title: toBridged('Work'), allowsContentModifications: true };
  const store = {
    defaultCalendarForNewEvents: calendar,
    calendarsForEntityType: () => ({ count: 1, objectAtIndex: () => calendar }),
    saveEventSpanCommitError: () => {
      event.eventIdentifier = toBridged('EVENT-1');
      return true;
    },
  };
  const bridge = Object.assign(() => toNil(), {
    NSDate: { dateWithTimeIntervalSince1970: (seconds: number) => toBridged(new Date(seconds * 1000)) },
    NSTimeZone: {
      timeZoneWithName: (name: string) => (KNOWN_ZONES.includes(name) ? toBridged(name) : toNil()),
      systemTimeZone: toBridged(SYSTEM_ZONE),
    },
    NSURL: { URLWithString: (text: string) => (text === REJECTED_URL ? toNil() : toBridged(text)) },
    EKEventStore: { alloc: { init: store } },
    EKEvent: { eventWithEventStore: () => event },
    EKAlarm: { alarmWithRelativeOffset: (offset: number) => ({ offset }) },
    EKEntityTypeEvent: 0,
    EKSpanThisEvent: 0,
  });
  const objC = { import: () => undefined, unwrap: ({ value }: Bridged) => value };
  const run = new Function('ObjC', '$', 'Ref', `${CREATE_EVENT_JXA}\nreturn run;`)(objC, bridge, () => []);

  return { output: JSON.parse(run([JSON.stringify(input)])), event, alarms };
}

describe('create-event.jxa', () => {
  describe('CREATE_EVENT_JXA', () => {
    it('should keep a URL that NSURL rejects in the notes on its own line, so it is never dropped', () => {
      const { output, event } = runCreateEvent({ ...payload, url: REJECTED_URL });

      expect(output).toEqual({ ok: true, id: 'EVENT-1' });
      expect(event.notes).toBe(`Daily sync\n${REJECTED_URL}`);
      expect(event.URL).toBeUndefined();
    });

    it('should put a rejected URL alone in the notes when there are none', () => {
      const { event } = runCreateEvent({ ...payload, notes: undefined, url: REJECTED_URL });

      expect(event.notes).toBe(REJECTED_URL);
    });

    it('should set a URL that NSURL accepts and leave the notes alone', () => {
      const { event } = runCreateEvent({ ...payload, url: 'https://zoom.us/j/123' });

      expect(event.notes).toBe('Daily sync');
      expect((event.URL as Bridged | undefined)?.value).toBe('https://zoom.us/j/123');
    });

    it('should fall back to the system time zone when the zone name is unknown', () => {
      const { event } = runCreateEvent({ ...payload, timeZone: 'Not/AZone' });

      expect((event.timeZone as Bridged | undefined)?.value).toBe(SYSTEM_ZONE);
    });

    it('should keep a known time zone', () => {
      const { event } = runCreateEvent(payload);

      expect((event.timeZone as Bridged | undefined)?.value).toBe('America/New_York');
    });

    it('should never set a time zone on an all-day event, so it floats', () => {
      const { event } = runCreateEvent({ ...payload, allDay: true });

      expect(event.allDay).toBe(true);
      expect('timeZone' in event).toBe(false);
    });

    it('should add one alarm the alert minutes before the start', () => {
      const { alarms } = runCreateEvent({ ...payload, alertMinutes: 10 });

      expect(alarms).toEqual([{ offset: -600 }]);
    });

    it('should add no alarm without alert minutes', () => {
      const { alarms } = runCreateEvent(payload);

      expect(alarms).toEqual([]);
    });

    it('should reach nothing outside the handler, since osascript runs it from its source alone', () => {
      expect(CREATE_EVENT_JXA).not.toMatch(/__name\(|__vi_|__vite_ssr|\brequire\(|(?<!ObjC\.)\bimport\b/);
    });
  });
});
