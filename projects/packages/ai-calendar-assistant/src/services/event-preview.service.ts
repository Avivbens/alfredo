import { CalendarEvent } from '../models/calendar-event.model';
import { beautifyDate, dateInTimezoneAsLocal, getCurrentTimezone } from './date.service';

/**
 * Build a multi-line, human-readable description of a parsed calendar event
 * for Alfred's Large Type preview (cmd+Enter). Lines for missing fields are
 * omitted so the card stays tight. Time strings use the event's IANA timezone
 * so they match what the user typed and what the in-list subtitle shows.
 */
export function buildEventPreview(event: CalendarEvent, machineTimezone: string = getCurrentTimezone()): string {
  const { allDayEvent, endDate, startDate, summary, description, location, url, timeZone } = event;

  const eventTimezone = timeZone ?? machineTimezone;
  const isLocal = eventTimezone === machineTimezone;
  const tzLabel = isLocal ? '' : ` (${eventTimezone.split('/').pop()?.replace(/_/g, ' ') ?? eventTimezone})`;
  const startDisplay = dateInTimezoneAsLocal(startDate, eventTimezone);
  const endDisplay = dateInTimezoneAsLocal(endDate, eventTimezone);
  const whenLine = allDayEvent
    ? 'All-day event'
    : `From ${beautifyDate(startDisplay)} to ${beautifyDate(endDisplay)}${tzLabel}`;

  const detailLines = [
    `When: ${whenLine}`,
    location ? `Where: ${location}` : null,
    url ? `Link: ${url}` : null,
    !isLocal ? `Timezone: ${eventTimezone}` : null,
  ].filter((line): line is string => line !== null);

  return [summary, '', ...detailLines, ...(description ? ['', description] : [])].join('\n');
}
