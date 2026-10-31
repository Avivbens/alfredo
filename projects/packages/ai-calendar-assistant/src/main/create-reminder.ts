import { FastAlfred } from 'fast-alfred';
import { runAppleScript } from '@alfredo/run-applescript';
import { GeminiReminderSchema, OpenAIReminderSchema } from '../models/reminder.model';
import { SettingsSchema } from '../models/settings.model';
import { reminderCreatorAppleScript } from '../services/reminder-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  const { reminderListName: listName, openNewReminder, model } = alfredClient.env.parse(SettingsSchema);
  const reminderSchema = model?.includes('gemini') ? GeminiReminderSchema : OpenAIReminderSchema;

  const reminder = reminderSchema.parse(JSON.parse(alfredClient.input));

  const creationScript = reminderCreatorAppleScript(listName, reminder, openNewReminder);
  await runAppleScript(creationScript);
})();
