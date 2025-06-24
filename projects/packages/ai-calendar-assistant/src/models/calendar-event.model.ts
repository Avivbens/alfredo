import { z } from 'zod';

// Base properties with descriptions
const summary = z.string().describe('The title of the event.');
const startDate = z.coerce.date().describe('The start date and time of the event in ISO 8601 format.');
const endDate = z.coerce
  .date()
  .describe(
    'The end date and time of the event in ISO 8601 format. If not provided, defaults to one hour after the start date.',
  );

const location = z.string().describe('The location of the event, if mentioned.');
const description = z.string().describe('Any additional details or notes about the event.');
const url = z.string().describe('A URL for the event, if provided.');
const allDayEvent = z.boolean().describe('Set to true if the event is for the whole day, otherwise false.');

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

type CalendarEventTransformInput = {
  summary: string;
  startDate: Date;
  endDate?: Date | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  allDayEvent?: boolean | null;
};

const eventTransform = (data: CalendarEventTransformInput) => {
  const startDate = new Date(data.startDate);
  const endDate = data.endDate ? new Date(data.endDate) : new Date(startDate.getTime() + ONE_HOUR_IN_MS);

  return {
    ...data,
    startDate,
    endDate,
  };
};

// Schema for OpenAI models: uses .nullable() for optional fields
export const OpenAICalendarEventSchema = z
  .object({
    summary,
    startDate,
    endDate: endDate.nullable(),
    location: location.nullable(),
    description: description.nullable(),
    url: url.nullable(),
    allDayEvent: allDayEvent.nullable().default(false),
  })
  .transform(eventTransform);

// Schema for Gemini models: uses .optional() for optional fields
export const GeminiCalendarEventSchema = z
  .object({
    summary,
    startDate,
    endDate: endDate.optional().nullable(),
    location: location.optional(),
    description: description.optional(),
    url: url.optional(),
    allDayEvent: allDayEvent.optional().default(false),
  })
  .transform(eventTransform);

export type CalendarEvent = z.infer<typeof GeminiCalendarEventSchema>;
