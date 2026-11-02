import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { registerUpdater } from '@alfredo/updater';
import { CalendarEntity } from '../models/access-status.enum';
import { SettingsSchema } from '../models/settings.model';
import { isRepeatApplicable } from '../services/eventkit-payload.service';
import { hasFullAccess } from '../services/eventkit.service';
import { extractReminder } from '../services/reminder-extractor.service';
import { buildReminderPreview, buildReminderSubtitle } from '../services/reminder-preview.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('ai-calendar-assistant'));

  try {
    const { token, model, debounceTime, sliceAmount } = alfredClient.env.parse(SettingsSchema);

    if (!token || !model) {
      throw new Error('Token or model is not defined!');
    }

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(debounceTime);

    if (!alfredClient.input) {
      alfredClient.error(new Error('No input provided'));
      return;
    }

    const [{ reminders }, fullAccess] = await Promise.all([
      extractReminder(token, model, alfredClient.input),
      hasFullAccess(CalendarEntity.Reminder),
    ]);

    if (!reminders.length) {
      alfredClient.output({ items: [{ title: 'No reminders found', subtitle: 'Try rephrasing your input.' }] });
      return;
    }

    const items: AlfredListItem[] = reminders.map((currReminder) => {
      const { title, dueDate } = currReminder;

      const repeatApplies = fullAccess && isRepeatApplicable(currReminder);
      const subtitle = buildReminderSubtitle(currReminder, { repeatApplies });
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
            arg: buildReminderPreview(currReminder, { repeatApplies }),
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
