import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { EXTRACT_EVENT_SYSTEM_PROMPT } from '../common/prompts/extract-event-name.prompt';
import { Variables } from '../common/variables.enum';
import { GeminiCalendarEventSchema, OpenAICalendarEventSchema } from '../models/calendar-event.model';
import { adjustForTimezone, beautifyDate } from '../services/date.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });
    const denounceTime = alfredClient.env.getEnv(Variables.DEBOUNCE_TIME, {
      defaultValue: DEFAULT_DEBOUNCE_TIME,
      parser: Number,
    });

    const token: string | undefined = alfredClient.env.getEnv(Variables.LLM_TOKEN);
    const model: AvailableModels | undefined = alfredClient.env.getEnv(Variables.SELECTED_MODEL);

    if (!token || !model) {
      throw new Error('Token or model is not defined!');
    }

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(denounceTime);

    if (!alfredClient.input) {
      alfredClient.error(new Error('No input provided'));
      return;
    }

    /**
     * Select schema based on the model
     */
    const calendarEventSchema = model.includes('gemini') ? GeminiCalendarEventSchema : OpenAICalendarEventSchema;

    const system = await EXTRACT_EVENT_SYSTEM_PROMPT.format({ currentDate: new Date().toISOString() });
    const event = await callModelWithStructuredResponse(
      token,
      model,
      { system, user: alfredClient.input },
      calendarEventSchema,
    );

    const events = [event];

    const items: AlfredListItem[] = events.map((currEvent) => {
      const { allDayEvent, endDate, startDate, summary, description, location, url } = currEvent;

      const title = `${summary}${location ? ` | at ${location}` : ''}${url ? ` (${url})` : ''}`;
      const subtitle = `${allDayEvent ? 'All-day event' : `From ${beautifyDate(adjustForTimezone(startDate))} to ${beautifyDate(adjustForTimezone(endDate))}`} | ${description || 'No description'}`;
      const arg = JSON.stringify(currEvent);
      const uid = `${startDate}-${summary}`;

      return {
        title,
        uid,
        subtitle,
        arg,
      };
    });

    const sliced = items.slice(0, sliceAmount);
    alfredClient.output({ items: sliced });
  } catch (error) {
    alfredClient.error(error);
  }
})();
