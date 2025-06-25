import { FastAlfred } from 'fast-alfred';
import { runAppleScript } from '@alfredo/run-applescript';
import { Variables } from '../common/variables.enum';
import { CalendarEvent, GeminiCalendarEventSchema } from '../models/calendar-event.model';
import { eventCreatorScript } from '../services/event-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  const calendarName: string | undefined = alfredClient.env.getEnv(Variables.CALENDAR_NAME);
  if (!calendarName) {
    alfredClient.error(new Error('Calendar name is not defined!'));
    return;
  }

  const event: CalendarEvent = JSON.parse(alfredClient.input);
  const parsedEvent = GeminiCalendarEventSchema.parse(event);

  const creationScript = eventCreatorScript(calendarName, parsedEvent);

  await runAppleScript(creationScript);
})();
