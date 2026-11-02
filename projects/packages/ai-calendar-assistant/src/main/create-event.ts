import { FastAlfred } from 'fast-alfred';
import { stdout } from 'node:process';
import { toFailureMessage } from '../common/failure-message.util';
import { CalendarEvent, GeminiCalendarEventSchema, OpenAICalendarEventSchema } from '../models/calendar-event.model';
import { OpenEventPlatform } from '../models/open-event-platform.enum';
import { SettingsSchema } from '../models/settings.model';
import { applyMapLink, createEvent } from '../services/event-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const { calendarName, openNewEvent, openEventPlatform, mapProvider, model, eventAlertMinutes } =
      alfredClient.env.parse(SettingsSchema);

    const calendarEventSchema = model?.includes('gemini') ? GeminiCalendarEventSchema : OpenAICalendarEventSchema;

    const event: CalendarEvent = JSON.parse(alfredClient.input);
    const parsedEvent = calendarEventSchema.parse(event);

    /**
     * The non-open path always creates the event in Apple Calendar, so the maps link
     * must target Apple there regardless of the chosen open platform.
     */
    const targetPlatform = openNewEvent ? openEventPlatform : OpenEventPlatform.APPLE_CALENDAR;
    const eventWithMapLink = applyMapLink(parsedEvent, targetPlatform, mapProvider);

    await createEvent(eventWithMapLink, {
      platform: openEventPlatform,
      openAfter: openNewEvent,
      calendarName,
      alertMinutes: eventAlertMinutes,
    });
  } catch (error) {
    alfredClient.log(error instanceof Error ? (error.stack ?? error.message) : String(error));
    stdout.write(toFailureMessage(error));
  }
})();
