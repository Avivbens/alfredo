import { escapeAppleScriptString } from '@alfredo/run-applescript';
import { Reminder } from '../models/reminder.model';
import { formatDateToAppleScript } from './date.service';

export const reminderCreatorAppleScript = (
  listName: string | undefined,
  reminder: Reminder,
  shouldOpen: boolean,
): string => {
  const { title, notes, dueDate, allDay, recurrence } = reminder;

  const properties = [`name:"${escapeAppleScriptString(title)}"`];

  /** The repetition can only be written down, not applied — AppleScript has no repeat rule. */
  const bodyParts = [notes, recurrence ? `Repeat: ${recurrence}` : undefined].filter((part): part is string => !!part);

  if (bodyParts.length > 0) {
    properties.push(`body:"${bodyParts.map(escapeAppleScriptString).join('\\n\\n')}"`);
  }

  if (dueDate) {
    /**
     * `allday due date` keeps the reminder date-only, letting Reminders apply the
     * user's own all-day alert time. On a timed reminder `remind me date` is what
     * actually fires the notification, so it is pinned to the due date.
     */
    if (allDay) {
      properties.push(`allday due date:theDueDate`);
    } else {
      properties.push(`due date:theDueDate`, `remind me date:theDueDate`);
    }
  }

  const listTarget = listName ? `list "${escapeAppleScriptString(listName)}"` : 'default list';

  /**
   * Reveal the list, never the reminder: `show <reminder>` blocks for ~35s on
   * macOS 26 — long enough for the Apple event connection to die with -609 —
   * while `show <list>` returns in about a second and shows it just as well.
   */
  const openBlock = shouldOpen
    ? `  try
    show ${listTarget}
  end try
  activate`
    : '';

  return `
tell application "Reminders"
  ${dueDate ? formatDateToAppleScript('theDueDate', dueDate) : ''}
  tell ${listTarget}
    make new reminder with properties {${properties.join(', ')}}
  end tell
${openBlock}
end tell
`;
};
