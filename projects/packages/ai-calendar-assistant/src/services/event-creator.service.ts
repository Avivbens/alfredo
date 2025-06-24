import { CalendarEvent } from '../models/calendar-event.model';
import { adjustForTimezone, formatDateToAppleScript } from './date.service';

export const eventCreatorScript = (calendarName: string, event: CalendarEvent): string => {
  const { summary, startDate, endDate, location, description, url, allDayEvent } = event;

  const properties = [
    /*  */
    `summary:"${summary}"`,
    `start date:${formatDateToAppleScript(adjustForTimezone(startDate))}`,
    `end date:${formatDateToAppleScript(adjustForTimezone(endDate))}`,
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
    make new event with properties {${properties.join(', ')}}
  end tell
end tell
`;
};
