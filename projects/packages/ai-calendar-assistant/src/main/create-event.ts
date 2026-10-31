import { FastAlfred } from 'fast-alfred';
import { runAppleScript } from '@alfredo/run-applescript';
import { CalendarEvent, GeminiCalendarEventSchema, OpenAICalendarEventSchema } from '../models/calendar-event.model';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import { SettingsSchema } from '../models/settings.model';
import { applyMapLink, createInCalendar, eventCreatorAppleScript } from '../services/event-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  const { calendarName, openNewEvent, openEventPlatform, mapProvider, model } = alfredClient.env.parse(SettingsSchema);
  if (!calendarName) {
    alfredClient.error(new Error('Calendar name is not defined!'));
    return;
  }

  const calendarEventSchema = model?.includes('gemini') ? GeminiCalendarEventSchema : OpenAICalendarEventSchema;

  const event: CalendarEvent = JSON.parse(alfredClient.input);
  const parsedEvent = calendarEventSchema.parse(event);

  /**
   * The non-open path always creates the event in Apple Calendar via AppleScript,
   * so the maps link must target Apple there regardless of the chosen open platform.
   */
  const targetPlatform = openNewEvent ? openEventPlatform : OpenEventPlatform.APPLE_CALENDAR;
  const eventWithMapLink = applyMapLink(parsedEvent, targetPlatform, mapProvider);

  if (openNewEvent) {
    return await createInCalendar(openEventPlatform, calendarName, eventWithMapLink);
  }

  const creationScript = eventCreatorAppleScript(calendarName, eventWithMapLink, false);
  await runAppleScript(creationScript);
})();
