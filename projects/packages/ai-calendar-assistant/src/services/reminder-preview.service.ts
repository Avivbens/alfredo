import { Reminder } from '../models/reminder.model';
import { beautifyDate } from './date.service';

/**
 * Reminders exposes no repeat rule to AppleScript, so a requested repetition is
 * only ever recorded as text — warn with the same wording everywhere it shows.
 */
export const RECURRENCE_UNSUPPORTED_NOTE = '⚠︎ Repeat not supported — kept in notes';

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
export function buildReminderPreview(reminder: Reminder): string {
  const { title, notes, recurrence } = reminder;

  const detailLines = [
    `When: ${buildReminderDueLabel(reminder)}`,
    recurrence ? `Repeat: ${recurrence}` : null,
    recurrence ? RECURRENCE_UNSUPPORTED_NOTE : null,
  ].filter((line): line is string => line !== null);

  return [title, '', ...detailLines, ...(notes ? ['', notes] : [])].join('\n');
}
