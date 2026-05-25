import { $ } from 'zurk';
import { runAppleScript } from '@alfredo/run-applescript';
import { CalendarEvent } from '../models/calendar-event.model';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import { formatDateToAppleScript, formatGoogleDate, getCurrentTimezone } from './date.service';

export const eventCreatorAppleScript = (calendarName: string, event: CalendarEvent, shouldOpen: boolean): string => {
  const { summary, startDate, endDate, location, description, url, allDayEvent, timeZone } = event;

  /**
   * AppleScript Calendar events are floating — there's no settable `time zone`
   * property — so we cannot tag the event with its IANA timezone. To keep the
   * absolute moment correct (the event fires when it should), we hand AppleScript
   * the user's machine-local wall-clock of the same UTC moment. For non-local
   * events the description carries a `Timezone: …` hint so the user still knows
   * which timezone the event is anchored to.
   */
  const properties = [
    /*  */
    `summary:"${summary}"`,
    `start date:${formatDateToAppleScript(startDate)}`,
    `end date:${formatDateToAppleScript(endDate)}`,
  ];

  /**
   * Optional properties for the event.
   *
   * Apple Calendar's AppleScript dictionary does not expose a settable `time zone`
   * property on events (events are floating). To still surface the timezone to the
   * user, we append it to the description when it differs from undefined.
   */
  if (location) {
    properties.push(`location:"${location}"`);
  }
  const descriptionParts: string[] = [];
  if (description) {
    descriptionParts.push(description);
  }
  if (timeZone && timeZone !== getCurrentTimezone()) {
    descriptionParts.push(`Timezone: ${timeZone}`);
  }
  if (descriptionParts.length > 0) {
    properties.push(`description:"${descriptionParts.join('\\n\\n')}"`);
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
  const { summary, startDate, endDate, description, location, allDayEvent, timeZone } = event;
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', summary);

  const formattedStartDate = formatGoogleDate(startDate, allDayEvent, timeZone);
  const formattedEndDate = formatGoogleDate(endDate, allDayEvent, timeZone);
  url.searchParams.set('dates', `${formattedStartDate}/${formattedEndDate}`);

  if (timeZone) {
    /**
     * `ctz` makes Google Calendar interpret the wall-clock dates above in this
     * timezone, so events placed in a different country render correctly
     * regardless of the viewer's browser locale.
     */
    url.searchParams.set('ctz', timeZone);
  }

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
