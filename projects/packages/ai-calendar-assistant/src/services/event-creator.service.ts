import { $ } from 'zurk';
import { escapeAppleScriptString, runAppleScript } from '@alfredo/run-applescript';
import { toEventUrl } from '../common/calendar-links.util';
import { CalendarEntity } from '../models/access-status.enum';
import { CalendarEvent } from '../models/calendar-event.model';
import type { EventPayload, WriteFailure } from '../models/eventkit.schema';
import { MapProvider } from '../models/map-provider.enum';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import { formatDateToAppleScript, formatGoogleDate, getCurrentTimezone } from './date.service';
import { toEventPayload } from './eventkit-payload.service';
import { createEventWithEventKit, ensureEventKitAccess } from './eventkit.service';

const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const APPLE_MAPS_SEARCH_URL = 'https://maps.apple.com/?q=';
const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

type CreateEventOptions = Pick<EventPayload, 'calendarName' | 'alertMinutes'> & {
  platform: OpenEventPlatform;
  openAfter: boolean;
};

/**
 * Builds a maps "search" URL for the given location text.
 */
export function buildMapsSearchUrl(provider: MapProvider, location: string): string | undefined {
  const query = encodeURIComponent(location);
  switch (provider) {
    case MapProvider.GOOGLE_MAPS:
      return `${GOOGLE_MAPS_SEARCH_URL}${query}`;
    case MapProvider.APPLE_MAPS:
      return `${APPLE_MAPS_SEARCH_URL}${query}`;
    default:
      return undefined;
  }
}

/**
 * Returns a copy of the event with a clickable maps link attached, so a plain-text
 * location becomes navigable
 */
export function applyMapLink(
  event: CalendarEvent,
  targetPlatform: OpenEventPlatform,
  provider: MapProvider,
): CalendarEvent {
  const { url, location } = event;
  if (provider === MapProvider.OFF || !location || url) {
    return event;
  }

  const mapsLink = buildMapsSearchUrl(provider, location);
  if (!mapsLink) {
    return event;
  }

  if (targetPlatform === OpenEventPlatform.GOOGLE_CALENDAR) {
    const description = event.description ? `${event.description}\n\nLocation: ${mapsLink}` : `Location: ${mapsLink}`;
    return { ...event, description };
  }

  return { ...event, url: mapsLink };
}

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
    `summary:"${escapeAppleScriptString(summary)}"`,
    `start date:theStartDate`,
    `end date:theEndDate`,
  ];

  /**
   * Optional properties for the event.
   *
   * Apple Calendar's AppleScript dictionary does not expose a settable `time zone`
   * property on events (events are floating). To still surface the timezone to the
   * user, we append it to the description when it differs from undefined.
   */
  if (location) {
    properties.push(`location:"${escapeAppleScriptString(location)}"`);
  }
  const descriptionParts: string[] = [];
  if (description) {
    descriptionParts.push(escapeAppleScriptString(description));
  }
  if (timeZone && timeZone !== getCurrentTimezone()) {
    descriptionParts.push(escapeAppleScriptString(`Timezone: ${timeZone}`));
  }
  if (descriptionParts.length > 0) {
    properties.push(`description:"${descriptionParts.join('\\n\\n')}"`);
  }
  if (url) {
    properties.push(`url:"${escapeAppleScriptString(url)}"`);
  }

  properties.push(`allday event:${String(allDayEvent)}`);

  return `
tell application "Calendar"
  ${formatDateToAppleScript('theStartDate', startDate)}
  ${formatDateToAppleScript('theEndDate', endDate)}
  tell calendar "${escapeAppleScriptString(calendarName)}"
    set newEvent to (make new event with properties {${properties.join(', ')}})
  end tell
  ${shouldOpen ? 'show newEvent' : ''}
  ${shouldOpen ? 'activate' : ''}
end tell
`;
};

export async function eventCreatorGoogleCalendar(event: CalendarEvent): Promise<void> {
  const { summary, startDate, endDate, description, location, allDayEvent, timeZone } = event;
  const url = new URL(GOOGLE_CALENDAR_TEMPLATE_URL);
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

function toWriteError({ error, detail }: WriteFailure): Error {
  if (error === 'calendar-not-found') {
    return new Error(
      detail ? `Calendar "${detail}" was not found or is read-only` : 'No default calendar for new events',
    );
  }

  return new Error(`Failed to save the event: ${detail}`);
}

async function openSavedEvent(id: string): Promise<void> {
  const { stderr } = await $({ nothrow: true })`open ${toEventUrl(id)}`;
  if (stderr) {
    throw new Error(`Created the event but failed to open it: ${stderr}`);
  }
}

/** Only the AppleScript fallback needs a calendar name, because EventKit falls back to the default calendar. */
export async function createEvent(event: CalendarEvent, options: CreateEventOptions): Promise<void> {
  const { platform, openAfter, calendarName, alertMinutes } = options;
  if (openAfter && platform === OpenEventPlatform.GOOGLE_CALENDAR) {
    return await eventCreatorGoogleCalendar(event);
  }

  const hasEventKitAccess = await ensureEventKitAccess(CalendarEntity.Event);
  if (!hasEventKitAccess) {
    if (!calendarName) {
      throw new Error('Calendar name is not defined!');
    }

    await runAppleScript(eventCreatorAppleScript(calendarName, event, openAfter));
    return;
  }

  const payload = toEventPayload(event, { calendarName, alertMinutes, systemTimeZone: getCurrentTimezone() });
  const result = await createEventWithEventKit(payload);
  if (!result.ok) {
    throw toWriteError(result);
  }

  if (openAfter) {
    await openSavedEvent(result.id);
  }
}
