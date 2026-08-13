import { AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_REMINDER_SYSTEM_PROMPT } from '../common/prompts/extract-reminder.prompt';
import { GeminiRemindersSchema, OpenAIRemindersSchema, Reminders } from '../models/reminder.model';
import { dateTimezoneNatural } from './date.service';

export async function extractReminder(token: string, model: AvailableModels, input: string): Promise<Reminders> {
  /**
   * Select schema based on the model
   */
  const remindersSchema = model.includes('gemini') ? GeminiRemindersSchema : OpenAIRemindersSchema;

  const currentDate = dateTimezoneNatural(new Date());
  const system = await EXTRACT_REMINDER_SYSTEM_PROMPT.format({ currentDate });

  return await callModelWithStructuredResponse(token, model, { system, user: input }, remindersSchema);
}
