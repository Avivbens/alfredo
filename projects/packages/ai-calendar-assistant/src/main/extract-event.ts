import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { AvailableModelsSchema } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { Variables } from '../common/variables.enum';
import { beautifyDate, dateInTimezoneAsLocal, getCurrentTimezone } from '../services/date.service';
import { extractEvent } from '../services/event-extractor.service';
import { buildEventPreview } from '../services/event-preview.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('ai-calendar-assistant'));

  try {
    const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });
    const denounceTime = alfredClient.env.getEnv(Variables.DEBOUNCE_TIME, {
      defaultValue: DEFAULT_DEBOUNCE_TIME,
      parser: Number,
    });

    const token: string | undefined = alfredClient.env.getEnv(Variables.LLM_TOKEN);
    const rawModel = alfredClient.env.getEnv(Variables.SELECTED_MODEL);
    const model = rawModel ? AvailableModelsSchema.parse(rawModel) : undefined;

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

    const { events } = await extractEvent(token, model, alfredClient.input);

    if (!events.length) {
      alfredClient.output({ items: [{ title: 'No events found', subtitle: 'Try rephrasing your input.' }] });
      return;
    }

    const machineTimezone = getCurrentTimezone();
    const items: AlfredListItem[] = events.map((currEvent) => {
      const { allDayEvent, endDate, startDate, summary, description, location, url, timeZone } = currEvent;

      const title = `${summary}${location ? ` | at ${location}` : ''}${url ? ` (${url})` : ''}`;

      /**
       * Render the subtitle using the event's wall-clock at its IANA timezone
       * so the time matches what the user typed. When the event is in a
       * different zone than the machine, append a short label (the city part
       * of the IANA name) so the user knows the time is at-location.
       */
      const eventTimezone = timeZone ?? machineTimezone;
      const isLocal = eventTimezone === machineTimezone;
      const tzLabel = isLocal ? '' : ` (${eventTimezone.split('/').pop()?.replace(/_/g, ' ') ?? eventTimezone})`;
      const startDisplay = dateInTimezoneAsLocal(startDate, eventTimezone);
      const endDisplay = dateInTimezoneAsLocal(endDate, eventTimezone);
      const timeRange = `From ${beautifyDate(startDisplay)} to ${beautifyDate(endDisplay)}${tzLabel}`;
      const subtitle = `${allDayEvent ? 'All-day event' : timeRange} | ${description || 'No description'}`;
      const arg = JSON.stringify(currEvent);
      const uid = `${startDate}-${summary}`;

      return {
        title,
        uid,
        subtitle,
        arg,
        mods: {
          cmd: {
            subtitle: 'Preview',
            arg: buildEventPreview(currEvent, machineTimezone),
          },
        },
      };
    });

    const sliced = items.slice(0, sliceAmount);
    alfredClient.output({ items: sliced });
  } catch (error) {
    alfredClient.error(error);
  }
})();
