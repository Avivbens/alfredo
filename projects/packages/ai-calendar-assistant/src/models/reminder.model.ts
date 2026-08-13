import { z } from 'zod';

const title = z.string().describe('The title of the reminder.');
const notes = z.string().describe('Any additional details or notes for the reminder.');
/**
 * A raw string rather than `z.coerce.date()`: a bare date means all-day and a
 * date with a time does not, and coercing up front destroys that distinction.
 */
const dueDate = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Must be a valid ISO 8601 date')
  .describe(
    'The due date and time of the reminder in ISO 8601 format. Omit entirely when the user did not mention any date or time.',
  );
const allDay = z
  .boolean()
  .describe('Set to true when only a date was mentioned, without a specific time of day, otherwise false.');
/** Separate from the notes so the UI can warn that AppleScript cannot apply it. */
const recurrence = z
  .string()
  .describe(
    'The repetition the user asked for, in plain words (e.g. "every week on Sunday and Monday"). Set this only when the user explicitly asks for the reminder to repeat.',
  );

type ReminderTransformInput = {
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  allDay?: boolean | null;
  recurrence?: string | null;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `new Date('2026-08-14')` is UTC midnight — the previous day for anyone behind
 * UTC — so an all-day due date is re-anchored to local midnight of the day the
 * model named, which is what AppleScript's local components then read. Appending
 * a time is what makes `new Date` parse the value as local.
 */
const toDueDate = (raw: string, allDay: boolean): Date => {
  if (allDay && DATE_ONLY_PATTERN.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }

  const parsed = new Date(raw);

  return allDay ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : parsed;
};

const reminderTransform = (data: ReminderTransformInput) => {
  const raw = data.dueDate?.trim();
  const allDay = raw ? (data.allDay ?? DATE_ONLY_PATTERN.test(raw)) : false;

  return {
    title: data.title,
    allDay,
    /**
     * Normalize away the OpenAI-schema `null`s so downstream consumers only ever
     * see `string | undefined` and `Date | undefined`.
     */
    ...(data.notes ? { notes: data.notes } : {}),
    ...(data.recurrence ? { recurrence: data.recurrence } : {}),
    ...(raw ? { dueDate: toDueDate(raw, allDay) } : {}),
  };
};

// Schema for OpenAI models: uses .nullable() for optional fields
export const OpenAIReminderSchema = z
  .object({
    title,
    notes: notes.optional().nullable(),
    dueDate: dueDate.optional().nullable(),
    allDay: allDay.optional().nullable(),
    recurrence: recurrence.optional().nullable(),
  })
  .transform(reminderTransform);

export const OpenAIRemindersSchema = z.object({ reminders: z.array(OpenAIReminderSchema) });

// Schema for Gemini models: uses .optional() for optional fields
export const GeminiReminderSchema = z
  .object({
    title,
    notes: notes.optional(),
    dueDate: dueDate.optional(),
    allDay: allDay.optional(),
    recurrence: recurrence.optional(),
  })
  .transform(reminderTransform);

export const GeminiRemindersSchema = z.object({ reminders: z.array(GeminiReminderSchema) });

export type Reminder = z.infer<typeof GeminiReminderSchema>;
export type Reminders = z.infer<typeof GeminiRemindersSchema>;
