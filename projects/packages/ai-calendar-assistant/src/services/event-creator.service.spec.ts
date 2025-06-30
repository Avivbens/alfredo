import * as zurk from 'zurk';
import { runAppleScript } from '@alfredo/run-applescript';
import { CalendarEvent } from '../models/calendar-event.model';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import * as dateService from './date.service';
import { createInCalendar, eventCreatorAppleScript, eventCreatorGoogleCalendar } from './event-creator.service';

// Mock zurk
const zurkTemplateLiteralFn = jest.fn().mockResolvedValue({ stderr: null });
jest.mock('zurk', () => ({
  $: jest.fn(() => zurkTemplateLiteralFn),
}));

// Mock runAppleScript
jest.mock('@alfredo/run-applescript', () => ({
  runAppleScript: jest.fn(),
}));

// Spy on dateService functions
jest.spyOn(dateService, 'dropTimezone');
jest.spyOn(dateService, 'formatDateToAppleScript');
jest.spyOn(dateService, 'formatGoogleDate');

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
    jest.clearAllMocks();
  });

  describe('eventCreatorAppleScript', () => {
    it('should generate a valid AppleScript for a basic event without opening', () => {
      const script = eventCreatorAppleScript(calendarName, baseEvent, false);
      expect(dateService.formatDateToAppleScript).toHaveBeenCalledTimes(2);
      expect(dateService.dropTimezone).toHaveBeenCalledTimes(2);
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
  });

  describe('eventCreatorGoogleCalendar', () => {
    it('should generate and open a valid Google Calendar URL', async () => {
      await eventCreatorGoogleCalendar(baseEvent);
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(baseEvent.startDate, false);
      expect(dateService.formatGoogleDate).toHaveBeenCalledWith(baseEvent.endDate, false);
      expect(zurk.$).toHaveBeenCalledWith({ nothrow: true });
      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('open ')]),
        expect.stringContaining('https://calendar.google.com/calendar/render'),
      );
    });

    it('should throw an error if opening the URL fails', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ stderr: 'Failed to open' });
      await expect(eventCreatorGoogleCalendar(baseEvent)).rejects.toThrow(
        'Failed to open Google Calendar: Failed to open',
      );
    });
  });

  describe('createInCalendar', () => {
    it('should call eventCreatorGoogleCalendar for Google Calendar platform', async () => {
      await createInCalendar(OpenEventPlatform.GOOGLE_CALENDAR, calendarName, baseEvent);
      expect(zurk.$).toHaveBeenCalled();
      expect(zurkTemplateLiteralFn).toHaveBeenCalled();
    });

    it('should call runAppleScript for Apple Calendar platform', async () => {
      await createInCalendar(OpenEventPlatform.APPLE_CALENDAR, calendarName, baseEvent);
      expect(runAppleScript).toHaveBeenCalledWith(expect.any(String));
    });

    it('should throw an error for an unsupported platform', async () => {
      await expect(createInCalendar('unsupported' as OpenEventPlatform, calendarName, baseEvent)).rejects.toThrow(
        'Unsupported platform: unsupported',
      );
    });
  });
});
