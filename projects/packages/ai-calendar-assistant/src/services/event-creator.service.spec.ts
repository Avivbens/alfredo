import { CalendarEvent } from '../models/calendar-event.model';
import { dropTimezone, formatDateToAppleScript } from './date.service';
import { eventCreatorScript } from './event-creator.service';

// Mock the date service
jest.mock('./date.service', () => ({
  dropTimezone: jest.fn((date) => date),
  formatDateToAppleScript: jest.fn((date) => `date "${date.toISOString()}"`),
}));

describe('eventCreatorScript', () => {
  const calendarName = 'Test Calendar';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a valid AppleScript for a basic event', () => {
    const event: CalendarEvent = {
      summary: 'Basic Event',
      startDate: new Date('2025-01-01T10:00:00.000Z'),
      endDate: new Date('2025-01-01T11:00:00.000Z'),
      allDayEvent: false,
    };

    const script = eventCreatorScript(calendarName, event);

    expect(formatDateToAppleScript).toHaveBeenCalledTimes(2);
    expect(dropTimezone).toHaveBeenCalledTimes(2);
    expect(script).toContain(`tell application "Calendar"`);
    expect(script).toContain(`tell calendar "${calendarName}"`);
    expect(script).toContain(`summary:"Basic Event"`);
    expect(script).toContain(`start date:date "2025-01-01T10:00:00.000Z"`);
    expect(script).toContain(`end date:date "2025-01-01T11:00:00.000Z"`);
    expect(script).toContain(`allday event:false`);
    expect(script).not.toContain('location:');
    expect(script).not.toContain('description:');
    expect(script).not.toContain('url:');
  });

  it('should generate a valid AppleScript for an event with all properties', () => {
    const event: CalendarEvent = {
      summary: 'Full Event',
      startDate: new Date('2025-01-01T10:00:00.000Z'),
      endDate: new Date('2025-01-01T11:00:00.000Z'),
      allDayEvent: false,
      location: 'The Office',
      description: 'A very important meeting.',
      url: 'http://example.com',
    };

    const script = eventCreatorScript(calendarName, event);

    expect(script).toContain(`summary:"Full Event"`);
    expect(script).toContain(`location:"The Office"`);
    expect(script).toContain(`description:"A very important meeting."`);
    expect(script).toContain(`url:"http://example.com"`);
    expect(script).toContain(`allday event:false`);
  });

  it('should generate a valid AppleScript for an all-day event', () => {
    const event: CalendarEvent = {
      summary: 'All-Day Event',
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-01-02T00:00:00.000Z'),
      allDayEvent: true,
    };

    const script = eventCreatorScript(calendarName, event);

    expect(script).toContain(`summary:"All-Day Event"`);
    expect(script).toContain(`allday event:true`);
  });
});
