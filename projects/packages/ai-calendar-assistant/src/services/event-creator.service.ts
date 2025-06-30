import { $ } from 'zurk';
import { runAppleScript } from '@alfredo/run-applescript';
import { CalendarEvent } from '../models/calendar-event.model';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import { dropTimezone, formatDateToAppleScript, formatGoogleDate } from './date.service';

export const eventCreatorAppleScript = (calendarName: string, event: CalendarEvent, shouldOpen: boolean): string => {
  const { summary, startDate, endDate, location, description, url, allDayEvent } = event;

  const properties = [
    /*  */
    `summary:"${summary}"`,
    `start date:${formatDateToAppleScript(dropTimezone(startDate))}`,
    `end date:${formatDateToAppleScript(dropTimezone(endDate))}`,
  ];

  /**
   * Optional properties for the event
   */
  if (location) {
    properties.push(`location:"${location}"`);
  }
  if (description) {
    properties.push(`description:"${description}"`);
  }
  if (url) {
    properties.push(`url:"${url}"`);
  }

  properties.push(`allday event:${String(allDayEvent)}`);

  return `
tell application "Calendar"
  tell calendar "${calendarName}"
    set newEvent to (make new event with properties {${properties.join(', ')}})
  end tell
  ${shouldOpen ? 'show newEvent' : ''}
  ${shouldOpen ? 'activate' : ''}
end tell
`;
};

export async function eventCreatorGoogleCalendar(event: CalendarEvent): Promise<void> {
  const { summary, startDate, endDate, description, location, allDayEvent } = event;
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', summary);

  const formattedStartDate = formatGoogleDate(startDate, allDayEvent);
  const formattedEndDate = formatGoogleDate(endDate, allDayEvent);
  url.searchParams.set('dates', `${formattedStartDate}/${formattedEndDate}`);

  if (description) {
    url.searchParams.set('details', description);
  }

  if (location) {
    url.searchParams.set('location', location);
  }

  const { stderr } = await $({ nothrow: true })`open ${url.toString()}`;
  if (stderr) {
    throw new Error(`Failed to open Google Calendar: ${stderr}`);
  }
}

export async function createInCalendar(
  platform: OpenEventPlatform,
  calendarName: string,
  event: CalendarEvent,
): Promise<void> {
  switch (platform) {
    case OpenEventPlatform.GOOGLE_CALENDAR: {
      return await eventCreatorGoogleCalendar(event);
    }

    case OpenEventPlatform.APPLE_CALENDAR: {
      const script = eventCreatorAppleScript(calendarName, event, true);
      await runAppleScript(script);
      return;
    }

    default: {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
