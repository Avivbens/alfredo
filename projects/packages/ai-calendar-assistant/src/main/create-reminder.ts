import { FastAlfred } from 'fast-alfred';
import { stdout } from 'node:process';
import { toFailureMessage } from '../common/failure-message.util';
import { GeminiReminderSchema, OpenAIReminderSchema } from '../models/reminder.model';
import { SettingsSchema } from '../models/settings.model';
import { createReminder } from '../services/reminder-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const { reminderListName: listName, openNewReminder, model } = alfredClient.env.parse(SettingsSchema);
    const reminderSchema = model?.includes('gemini') ? GeminiReminderSchema : OpenAIReminderSchema;

    const reminder = reminderSchema.parse(JSON.parse(alfredClient.input));

    await createReminder(reminder, { listName, openAfter: openNewReminder });
  } catch (error) {
    alfredClient.log(error instanceof Error ? (error.stack ?? error.message) : String(error));
    stdout.write(toFailureMessage(error));
  }
})();
