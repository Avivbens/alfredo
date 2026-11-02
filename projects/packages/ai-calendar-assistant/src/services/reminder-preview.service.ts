import { Reminder } from '../models/reminder.model';
import { beautifyDate } from './date.service';

/**
 * Without EventKit access or a due date, a requested repetition is only recorded
 * as text, so warn with the same wording everywhere it shows.
 */
export const RECURRENCE_UNSUPPORTED_NOTE = '⚠︎ Repeat not supported — kept in notes';

type ReminderPreviewOptions = { repeatApplies: boolean };

/**
 * Shared by the Alfred subtitle and the Large Type preview so the two never
 * describe the same reminder differently.
 */
export function buildReminderDueLabel(reminder: Reminder): string {
  const { dueDate, allDay } = reminder;

  if (!dueDate) {
    return 'No due date';
  }

  const beautified = beautifyDate(dueDate);
  if (!allDay) {
    return `Due ${beautified}`;
  }

  /** `beautifyDate` always appends `, <time>`, which is noise for a date-only reminder. */
  const timeSeparator = beautified.lastIndexOf(', ');
  const dayOnly = timeSeparator === -1 ? beautified : beautified.slice(0, timeSeparator);

  return `Due ${dayOnly} (all day)`;
}

/**
 * Build a multi-line, human-readable description of a parsed reminder for
 * Alfred's Large Type preview (cmd+Enter). Lines for missing fields are omitted
 * so the card stays tight.
 */
export function buildReminderPreview(reminder: Reminder, options: ReminderPreviewOptions): string {
  const { title, notes, recurrence } = reminder;

  const detailLines = [
    `When: ${buildReminderDueLabel(reminder)}`,
    recurrence ? `Repeat: ${recurrence}` : null,
    recurrence && !options.repeatApplies ? RECURRENCE_UNSUPPORTED_NOTE : null,
  ].filter((line): line is string => line !== null);

  return [title, '', ...detailLines, ...(notes ? ['', notes] : [])].join('\n');
}

/** Warn before the user commits, so a reminder that will not repeat cannot look like one that will. */
function toSubtitleTrailing({ notes, recurrence }: Reminder, { repeatApplies }: ReminderPreviewOptions): string {
  if (!recurrence) {
    return notes || 'No notes';
  }

  return repeatApplies ? `Repeats ${recurrence}` : RECURRENCE_UNSUPPORTED_NOTE;
}

export function buildReminderSubtitle(reminder: Reminder, options: ReminderPreviewOptions): string {
  return `${buildReminderDueLabel(reminder)} | ${toSubtitleTrailing(reminder, options)}`;
}
