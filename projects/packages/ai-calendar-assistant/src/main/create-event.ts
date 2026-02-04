import { FastAlfred } from 'fast-alfred';
import { runAppleScript } from '@alfredo/run-applescript';
import { Variables } from '../common/variables.enum';
import { CalendarEvent, GeminiCalendarEventSchema } from '../models/calendar-event.model';
import { OpenEventPlatform, OpenEventPlatformSchema } from '../models/open-event-platform.enum';
import { createInCalendar, eventCreatorAppleScript } from '../services/event-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  const calendarName: string | undefined = alfredClient.env.getEnv(Variables.CALENDAR_NAME);
  if (!calendarName) {
    alfredClient.error(new Error('Calendar name is not defined!'));
    return;
  }

  const openNewEvent: boolean = alfredClient.env.getEnv(Variables.SHOULD_OPEN_NEW_EVENT, {
    defaultValue: false,
    parser: (value) => (value as '0' | '1') === '1',
  });

  const openEventPlatform = OpenEventPlatformSchema.parse(
    alfredClient.env.getEnv(Variables.OPEN_NEW_EVENT_PLATFORM, {
      defaultValue: OpenEventPlatform.APPLE_CALENDAR,
    }),
  );

  const event: CalendarEvent = JSON.parse(alfredClient.input);
  const parsedEvent = GeminiCalendarEventSchema.parse(event);

  if (openNewEvent) {
    return await createInCalendar(openEventPlatform, calendarName, parsedEvent);
  }

  const creationScript = eventCreatorAppleScript(calendarName, parsedEvent, false);
  await runAppleScript(creationScript);
})();
