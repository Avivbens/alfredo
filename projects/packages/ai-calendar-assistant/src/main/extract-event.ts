import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { AvailableModels } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { Variables } from '../common/variables.enum';
import { beautifyDate, dropTimezone } from '../services/date.service';
import { extractEvent } from '../services/event-extractor.service';

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

    const events = await extractEvent(token, model, alfredClient.input);

    if (!events.length) {
      alfredClient.output({ items: [{ title: 'No events found', subtitle: 'Try rephrasing your input.' }] });
      return;
    }

    const items: AlfredListItem[] = events.map((currEvent) => {
      const { allDayEvent, endDate, startDate, summary, description, location, url } = currEvent;

      const title = `${summary}${location ? ` | at ${location}` : ''}${url ? ` (${url})` : ''}`;
      const subtitle = `${allDayEvent ? 'All-day event' : `From ${beautifyDate(dropTimezone(startDate))} to ${beautifyDate(dropTimezone(endDate))}`} | ${description || 'No description'}`;
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
