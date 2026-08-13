import { FastAlfred } from 'fast-alfred';
import { AvailableModelsSchema } from '@alfredo/llm';
import { runAppleScript } from '@alfredo/run-applescript';
import { Variables } from '../common/variables.enum';
import { GeminiReminderSchema, OpenAIReminderSchema } from '../models/reminder.model';
import { reminderCreatorAppleScript } from '../services/reminder-creator.service';

(async () => {
  const alfredClient = new FastAlfred();

  /** An empty list name is valid — it falls back to the Reminders default list. */
  const configuredList: string | undefined = alfredClient.env.getEnv(Variables.REMINDER_LIST_NAME);
  const listName: string | undefined = configuredList?.trim() || undefined;

  const openNewReminder: boolean = alfredClient.env.getEnv(Variables.SHOULD_OPEN_NEW_REMINDER, {
    defaultValue: false,
    parser: (value) => (value as '0' | '1') === '1',
  });

  const rawModel = alfredClient.env.getEnv(Variables.SELECTED_MODEL);
  const model = rawModel ? AvailableModelsSchema.parse(rawModel) : undefined;
  const reminderSchema = model?.includes('gemini') ? GeminiReminderSchema : OpenAIReminderSchema;

  const reminder = reminderSchema.parse(JSON.parse(alfredClient.input));

  const creationScript = reminderCreatorAppleScript(listName, reminder, openNewReminder);
  await runAppleScript(creationScript);
})();
