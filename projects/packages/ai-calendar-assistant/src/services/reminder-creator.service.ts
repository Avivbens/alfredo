import { escapeAppleScriptString, runAppleScript } from '@alfredo/run-applescript';
import { toFailureMessage } from '../common/failure-message.util';
import { CalendarEntity } from '../models/access-status.enum';
import type { ReminderPayload, WriteFailure } from '../models/eventkit.schema';
import { Reminder } from '../models/reminder.model';
import { formatDateToAppleScript } from './date.service';
import { toReminderPayload } from './eventkit-payload.service';
import { createReminderWithEventKit, ensureEventKitAccess } from './eventkit.service';

type CreateReminderOptions = Pick<ReminderPayload, 'listName'> & { openAfter: boolean };

function toListTarget(listName: string | undefined): string {
  return listName ? `list "${escapeAppleScriptString(listName)}"` : 'default list';
}

/**
 * Reveal the list, never the reminder: `show <reminder>` blocks for ~35s on
 * macOS 26, long enough for the Apple event connection to die with -609,
 * while `show <list>` returns in about a second and shows it just as well.
 */
function toShowListLines(listTarget: string): string {
  return `  try
    show ${listTarget}
  end try
  activate`;
}

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

  const listTarget = toListTarget(listName);
  const openBlock = shouldOpen ? toShowListLines(listTarget) : '';

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

function toWriteError({ error, detail }: WriteFailure): Error {
  if (error === 'list-not-found') {
    return new Error(
      detail ? `Reminders list "${detail}" was not found or is read-only` : 'No default list for new reminders',
    );
  }

  return new Error(`Failed to save the reminder: ${detail}`);
}

async function showSavedReminderList(listName: string | undefined): Promise<void> {
  try {
    await runAppleScript(`tell application "Reminders"
${toShowListLines(toListTarget(listName))}
end tell`);
  } catch (error) {
    throw new Error(`Created the reminder but failed to show its list: ${toFailureMessage(error)}`, { cause: error });
  }
}

/** The AppleScript fallback runs unchanged, so a denied user still gets the reminder with its repeat in the notes. */
export async function createReminder(reminder: Reminder, options: CreateReminderOptions): Promise<void> {
  const { listName, openAfter } = options;
  const hasEventKitAccess = await ensureEventKitAccess(CalendarEntity.Reminder);
  if (!hasEventKitAccess) {
    await runAppleScript(reminderCreatorAppleScript(listName, reminder, openAfter));
    return;
  }

  const result = await createReminderWithEventKit(toReminderPayload(reminder, { listName }));
  if (!result.ok) {
    throw toWriteError(result);
  }

  if (openAfter) {
    await showSavedReminderList(listName);
  }
}
