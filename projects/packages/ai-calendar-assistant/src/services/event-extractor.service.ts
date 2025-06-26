import { AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_EVENT_SYSTEM_PROMPT } from '../common/prompts/extract-event-name.prompt';
import { CalendarEvents, GeminiCalendarEventsSchema, OpenAICalendarEventsSchema } from '../models/calendar-event.model';
import { dateTimezoneNatural } from './date.service';

export async function extractEvent(token: string, model: AvailableModels, input: string): Promise<CalendarEvents> {
  /**
   * Select schema based on the model
   */
  const calendarEventsSchema = model.includes('gemini') ? GeminiCalendarEventsSchema : OpenAICalendarEventsSchema;

  const currentDate = dateTimezoneNatural(new Date());
  const system = await EXTRACT_EVENT_SYSTEM_PROMPT.format({ currentDate });

  const events = await callModelWithStructuredResponse(token, model, { system, user: input }, calendarEventsSchema);

  return events;
}
