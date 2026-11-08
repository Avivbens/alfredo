import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as zurk from 'zurk';
import { runAppleScript } from '@alfredo/run-applescript';
import { ACCESS_JXA } from '../common/jxa/access.jxa';
import { CREATE_EVENT_JXA } from '../common/jxa/create-event.jxa';
import { CalendarEvent } from '../models/calendar-event.model';
import { eventPayloadSchema } from '../models/eventkit.schema';
import type { EventPayload } from '../models/eventkit.schema';
import { MapProvider } from '../models/map-provider.enum';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import * as dateService from './date.service';
import {
  applyMapLink,
  buildMapsSearchUrl,
  createEvent,
  eventCreatorAppleScript,
  eventCreatorGoogleCalendar,
} from './event-creator.service';

// Mock zurk
const { zurkTemplateLiteralFn } = vi.hoisted(() => ({
  zurkTemplateLiteralFn: vi.fn().mockResolvedValue({ stderr: null }),
}));
vi.mock('zurk', () => ({
  $: vi.fn(() => zurkTemplateLiteralFn),
}));

// Mock runAppleScript, keeping the real escaping so the generated script is asserted as-is
vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

// Spy on dateService functions
vi.spyOn(dateService, 'formatDateToAppleScript');
vi.spyOn(dateService, 'formatGoogleDate');
vi.spyOn(dateService, 'getCurrentTimezone').mockReturnValue('Asia/Jerusalem');

/** Raw ACCESS_JXA and CREATE_EVENT_JXA output: statuses come back as EKAuthorizationStatus numbers. */
const FULL_ACCESS = '{"event":3,"reminder":3}';
const DENIED = '{"event":2,"reminder":3}';
const UNDETERMINED = '{"event":0,"reminder":0}';
const SAVED = '{"ok":true,"id":"EVENT-1:2026"}';

type EventKitReplies = { access: string; request?: string; create?: string };

/** Mirrors ACCESS_JXA: a request returns the entity's status as is, and only an undetermined one gets the prompt's answer. */
function toAccessReply(access: string, request: string, arg = '{}'): string {
  const { mode, entity } = JSON.parse(arg);
  if (mode !== 'request') {
    return access;
  }

  const status = String(JSON.parse(access)[entity]);
  return status === '0' ? request : status;
}

function mockEventKit({ access, request = '2', create = SAVED }: EventKitReplies): void {
  vi.mocked(runAppleScript).mockImplementation(async (script, options) => {
    if (script === ACCESS_JXA) {
      return toAccessReply(access, request, options?.args?.[0]);
    }

    return script === CREATE_EVENT_JXA ? create : '';
  });
}

function getCreatePayload(): EventPayload | undefined {
  const input = vi.mocked(runAppleScript).mock.calls.find(([script]) => script === CREATE_EVENT_JXA)?.[1]?.args?.[0];

  return input ? eventPayloadSchema.parse(JSON.parse(input)) : undefined;
}

describe('event-creator.service', () => {
  const calendarName = 'Test Calendar';
  const baseEvent: CalendarEvent = {
    summary: 'Test Event',
    startDate: new Date('2025-01-01T10:00:00.000Z'),
    endDate: new Date('2025-01-01T11:00:00.000Z'),
    allDayEvent: false,
  };

  beforeEach(() => {
    zurkTemplateLiteralFn.mockResolvedValue({ stderr: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('eventCreatorAppleScript', () => {
    it('should generate a valid AppleScript for a basic event without opening', () => {
      const script = eventCreatorAppleScript(calendarName, baseEvent, false);
      expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theStartDate', baseEvent.startDate);
      expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theEndDate', baseEvent.endDate);
      expect(script).toContain(`tell application "Calendar"`);
      expect(script).toContain(`tell calendar "${calendarName}"`);
      expect(script).toContain(`summary:"Test Event"`);
      expect(script).toContain('set newEvent to (make new event with properties');
      expect(script).not.toContain('show newEvent');
      expect(script).not.toContain('activate');
    });

    it('should generate a valid AppleScript and open the event', () => {
      const script = eventCreatorAppleScript(calendarName, baseEvent, true);
      expect(script).toContain(`tell application "Calendar"`);
      expect(script).toContain(`tell calendar "${calendarName}"`);
      expect(script).toContain('set newEvent to (make new event with properties');
      expect(script).toContain('show newEvent');
      expect(script).toContain('activate');
    });

    it('should include optional properties when provided', () => {
      const fullEvent: CalendarEvent = {
        ...baseEvent,
        location: 'The Office',
        description: 'A very important meeting.',
        url: 'http://example.com',
      };
      const script = eventCreatorAppleScript(calendarName, fullEvent, false);
      expect(script).toContain(`location:"The Office"`);
      expect(script).toContain(`description:"A very important meeting."`);
      expect(script).toContain(`url:"http://example.com"`);
    });

    it('should handle all-day events correctly', () => {
      const allDayEvent = { ...baseEvent, allDayEvent: true };
      const script = eventCreatorAppleScript(calendarName, allDayEvent, false);
      expect(script).toContain(`allday event:true`);
    });

    it('should not include optional properties when they are empty strings', () => {
      const emptyPropsEvent: CalendarEvent = {
        ...baseEvent,
        location: '',
        description: '',
        url: '',
      };
      const script = eventCreatorAppleScript(calendarName, emptyPropsEvent, false);
      expect(script).not.toContain(`location:""`);
      expect(script).not.toContain(`description:""`);
      expect(script).not.toContain(`url:""`);
    });

    it('should append timezone to the description when it differs from the machine timezone', () => {
      const tzEvent: CalendarEvent = {
        ...baseEvent,
        description: 'Original notes.',
        timeZone: 'Europe/Madrid',
      };
      const script = eventCreatorAppleScript(calendarName, tzEvent, false);
      expect(script).toContain(`description:"Original notes.\\n\\nTimezone: Europe/Madrid"`);
    });

    it('should add a timezone-only description when no other description is set', () => {
      const tzEvent: CalendarEvent = { ...baseEvent, timeZone: 'Europe/Madrid' };
      const script = eventCreatorAppleScript(calendarName, tzEvent, false);
      expect(script).toContain(`description:"Timezone: Europe/Madrid"`);
    });

    it('should NOT append timezone when it matches the machine timezone', () => {
      const tzEvent: CalendarEvent = { ...baseEvent, timeZone: 'Asia/Jerusalem' };
      const script = eventCreatorAppleScript(calendarName, tzEvent, false);
      expect(script).not.toContain('Timezone:');
    });

    it('should escape the timezone, since the model fills it from selected text that can carry AppleScript', () => {
      const tzEvent: CalendarEvent = { ...baseEvent, timeZone: 'X" & (do shell script "id") & "' };

      const script = eventCreatorAppleScript(calendarName, tzEvent, false);

      expect(script).toContain(`description:"Timezone: X\\" & (do shell script \\"id\\") & \\""`);
    });

    it('should escape quotes and newlines so model output cannot break the script', () => {
      const quotedEvent: CalendarEvent = {
        ...baseEvent,
        summary: 'Lunch at Joe"s',
        description: 'First line\nSecond line',
      };
      const script = eventCreatorAppleScript('Joe"s Calendar', quotedEvent, false);

      expect(script).toContain(`summary:"Lunch at Joe\\"s"`);
      expect(script).toContain(`description:"First line\\nSecond line"`);
      expect(script).toContain(`tell calendar "Joe\\"s Calendar"`);
    });

    it('should pass start/end dates straight to formatDateToAppleScript regardless of timezone', () => {
      const tzEvent: CalendarEvent = { ...baseEvent, timeZone: 'Europe/Madrid' };
      eventCreatorAppleScript(calendarName, tzEvent, false);
      expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theStartDate', tzEvent.startDate);
      expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theEndDate', tzEvent.endDate);
    });
  });

  describe('eventCreatorGoogleCalendar', () => {
    it('should generate and open a valid Google Calendar URL', async () => {
      await eventCreatorGoogleCalendar(baseEvent);
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(baseEvent.startDate, false, undefined);
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(baseEvent.endDate, false, undefined);
      expect(zurk.$).toHaveBeenCalledWith({ nothrow: true });
      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('open ')]),
        expect.stringContaining('https://calendar.google.com/calendar/render'),
      );
    });

    it('should pass the event timeZone to formatGoogleDate and include ctz in the URL', async () => {
      const eventWithTz: CalendarEvent = { ...baseEvent, timeZone: 'America/New_York' };
      await eventCreatorGoogleCalendar(eventWithTz);
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(eventWithTz.startDate, false, 'America/New_York');
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(eventWithTz.endDate, false, 'America/New_York');
      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('ctz=America%2FNew_York'),
      );
    });

    it('should throw an error if opening the URL fails', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ stderr: 'Failed to open' });
      await expect(eventCreatorGoogleCalendar(baseEvent)).rejects.toThrow(
        'Failed to open Google Calendar: Failed to open',
      );
    });
  });

  describe('createEvent', () => {
    const appleOptions = { platform: OpenEventPlatform.APPLE_CALENDAR, openAfter: false, calendarName };

    it('should create through EventKit when full access is granted, even without opening', async () => {
      mockEventKit({ access: FULL_ACCESS });

      await createEvent({ ...baseEvent, timeZone: 'America/New_York' }, { ...appleOptions, alertMinutes: 10 });

      expect(getCreatePayload()).toEqual({
        title: 'Test Event',
        start: '2025-01-01T10:00:00.000Z',
        end: '2025-01-01T11:00:00.000Z',
        allDay: false,
        calendarName,
        timeZone: 'America/New_York',
        alertMinutes: 10,
      });
      expect(runAppleScript).not.toHaveBeenCalledWith(expect.stringContaining('tell application "Calendar"'));
      expect(zurk.$).not.toHaveBeenCalled();
    });

    it('should create in the default calendar through EventKit when the name is empty', async () => {
      mockEventKit({ access: FULL_ACCESS });

      await createEvent(baseEvent, { ...appleOptions, calendarName: '' });

      expect(getCreatePayload()).toMatchObject({ calendarName: '', timeZone: 'Asia/Jerusalem' });
    });

    it('should fall back to AppleScript when access is denied', async () => {
      mockEventKit({ access: DENIED });

      await createEvent(baseEvent, appleOptions);

      expect(getCreatePayload()).toBeUndefined();
      expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining(`tell calendar "${calendarName}"`));
      expect(runAppleScript).not.toHaveBeenCalledWith(expect.stringContaining('show newEvent'));
    });

    it('should still require a calendar name on the AppleScript fallback', async () => {
      mockEventKit({ access: DENIED });

      await expect(createEvent(baseEvent, { ...appleOptions, calendarName: '' })).rejects.toThrow(
        'Calendar name is not defined!',
      );
      expect(runAppleScript).not.toHaveBeenCalledWith(expect.stringContaining('tell application "Calendar"'));
    });

    it('should show the new event in Calendar on the AppleScript fallback when openAfter is set', async () => {
      mockEventKit({ access: DENIED });

      await createEvent(baseEvent, { ...appleOptions, openAfter: true });

      expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining('show newEvent'));
      expect(zurk.$).not.toHaveBeenCalled();
    });

    it('should request access when undetermined and use EventKit once granted', async () => {
      mockEventKit({ access: UNDETERMINED, request: '3' });

      await createEvent(baseEvent, appleOptions);

      expect(runAppleScript).toHaveBeenCalledWith(ACCESS_JXA, {
        language: 'JavaScript',
        args: ['{"mode":"request","entity":"event"}'],
      });
      expect(vi.mocked(runAppleScript).mock.calls.filter(([script]) => script === ACCESS_JXA)).toHaveLength(1);
      expect(getCreatePayload()).toMatchObject({ title: 'Test Event' });
    });

    it('should fall back to AppleScript when the request ends without access', async () => {
      mockEventKit({ access: UNDETERMINED, request: '0' });

      await createEvent(baseEvent, appleOptions);

      expect(getCreatePayload()).toBeUndefined();
      expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining(`tell calendar "${calendarName}"`));
    });

    it('should open the saved event by its ical link when openAfter is set', async () => {
      mockEventKit({ access: FULL_ACCESS });

      await createEvent(baseEvent, { ...appleOptions, openAfter: true });

      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('open ')]),
        'ical://ekevent/EVENT-1%3A2026?method=show&options=more',
      );
      expect(runAppleScript).not.toHaveBeenCalledWith(expect.stringContaining('show newEvent'));
    });

    it('should report an event that was saved but failed to open', async () => {
      mockEventKit({ access: FULL_ACCESS });
      zurkTemplateLiteralFn.mockResolvedValue({ stderr: 'x' });

      await expect(createEvent(baseEvent, { ...appleOptions, openAfter: true })).rejects.toThrow(
        'Created the event but failed to open it: x',
      );
      expect(getCreatePayload()).toMatchObject({ title: 'Test Event' });
    });

    it('should keep the Google Calendar URL path when opening on Google', async () => {
      mockEventKit({ access: FULL_ACCESS });

      await createEvent(baseEvent, { ...appleOptions, platform: OpenEventPlatform.GOOGLE_CALENDAR, openAfter: true });

      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('https://calendar.google.com/calendar/render'),
      );
      expect(runAppleScript).not.toHaveBeenCalled();
    });

    it('should report a missing calendar by name', async () => {
      mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"calendar-not-found","detail":"Work"}' });

      await expect(createEvent(baseEvent, { ...appleOptions, calendarName: 'Work', openAfter: true })).rejects.toThrow(
        'Calendar "Work" was not found or is read-only',
      );
      expect(zurk.$).not.toHaveBeenCalled();
    });

    it('should report a missing default calendar when the name is empty', async () => {
      mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"calendar-not-found","detail":""}' });

      await expect(createEvent(baseEvent, { ...appleOptions, calendarName: '' })).rejects.toThrow(
        'No default calendar for new events',
      );
    });

    it('should report a failed save with its detail', async () => {
      mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"save-failed","detail":"No end date"}' });

      await expect(createEvent(baseEvent, appleOptions)).rejects.toThrow('Failed to save the event: No end date');
    });
  });

  describe('buildMapsSearchUrl', () => {
    it('should build a correctly-encoded Google Maps search URL', () => {
      expect(buildMapsSearchUrl(MapProvider.GOOGLE_MAPS, 'Eiffel Tower, Paris')).toBe(
        'https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower%2C%20Paris',
      );
    });

    it('should build a correctly-encoded Apple Maps search URL', () => {
      expect(buildMapsSearchUrl(MapProvider.APPLE_MAPS, 'Eiffel Tower, Paris')).toBe(
        'https://maps.apple.com/?q=Eiffel%20Tower%2C%20Paris',
      );
    });

    it('should return undefined when the provider is OFF', () => {
      expect(buildMapsSearchUrl(MapProvider.OFF, 'Eiffel Tower')).toBeUndefined();
    });
  });

  describe('applyMapLink', () => {
    const locatedEvent: CalendarEvent = { ...baseEvent, location: 'Eiffel Tower' };

    it('should set the url field to the maps link on the Apple path', () => {
      const result = applyMapLink(locatedEvent, OpenEventPlatform.APPLE_CALENDAR, MapProvider.APPLE_MAPS);
      expect(result.url).toBe('https://maps.apple.com/?q=Eiffel%20Tower');
      expect(result.location).toBe('Eiffel Tower');
    });

    it('should append the maps link to the description on the Google path and keep the location readable', () => {
      const result = applyMapLink(locatedEvent, OpenEventPlatform.GOOGLE_CALENDAR, MapProvider.GOOGLE_MAPS);
      expect(result.location).toBe('Eiffel Tower');
      expect(result.url).toBeUndefined();
      expect(result.description).toContain('https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower');
    });

    it('should preserve an existing description when appending the Google maps link', () => {
      const result = applyMapLink(
        { ...locatedEvent, description: 'Bring slides.' },
        OpenEventPlatform.GOOGLE_CALENDAR,
        MapProvider.GOOGLE_MAPS,
      );
      expect(result.description).toContain('Bring slides.');
      expect(result.description).toContain('https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower');
    });

    it('should leave the event untouched when an online-meeting URL already exists', () => {
      const onlineEvent: CalendarEvent = { ...locatedEvent, url: 'https://zoom.us/j/123' };
      const result = applyMapLink(onlineEvent, OpenEventPlatform.APPLE_CALENDAR, MapProvider.APPLE_MAPS);
      expect(result).toEqual(onlineEvent);
    });

    it('should leave the event untouched when there is no location', () => {
      const result = applyMapLink(baseEvent, OpenEventPlatform.APPLE_CALENDAR, MapProvider.APPLE_MAPS);
      expect(result).toEqual(baseEvent);
    });

    it('should leave the event untouched when the provider is OFF', () => {
      const result = applyMapLink(locatedEvent, OpenEventPlatform.APPLE_CALENDAR, MapProvider.OFF);
      expect(result).toEqual(locatedEvent);
    });
  });
});
