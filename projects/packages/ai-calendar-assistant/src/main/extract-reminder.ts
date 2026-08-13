import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { AvailableModelsSchema } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { Variables } from '../common/variables.enum';
import { extractReminder } from '../services/reminder-extractor.service';
import {
  RECURRENCE_UNSUPPORTED_NOTE,
  buildReminderDueLabel,
  buildReminderPreview,
} from '../services/reminder-preview.service';

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

    const { reminders } = await extractReminder(token, model, alfredClient.input);

    if (!reminders.length) {
      alfredClient.output({ items: [{ title: 'No reminders found', subtitle: 'Try rephrasing your input.' }] });
      return;
    }

    const items: AlfredListItem[] = reminders.map((currReminder) => {
      const { title, notes, dueDate, recurrence } = currReminder;

      /** Warn before the user commits, so a reminder that will not repeat cannot look like one that will. */
      const trailing = recurrence ? RECURRENCE_UNSUPPORTED_NOTE : notes || 'No notes';
      const subtitle = `${buildReminderDueLabel(currReminder)} | ${trailing}`;
      const arg = JSON.stringify(currReminder);
      const uid = `${dueDate?.toISOString() ?? 'no-due-date'}-${title}`;

      return {
        title,
        uid,
        subtitle,
        arg,
        mods: {
          cmd: {
            subtitle: 'Preview',
            arg: buildReminderPreview(currReminder),
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
