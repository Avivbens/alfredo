import type { z } from 'zod';
import { runAppleScript } from '@alfredo/run-applescript';
import { ACCESS_JXA } from '../common/jxa/access.jxa';
import { AGENDA_JXA } from '../common/jxa/agenda.jxa';
import type { AgendaInput } from '../common/jxa/agenda.jxa';
import { CREATE_EVENT_JXA } from '../common/jxa/create-event.jxa';
import { CREATE_REMINDER_JXA } from '../common/jxa/create-reminder.jxa';
import { AccessStatus, accessStatusSchema } from '../models/access-status.enum';
import type { CalendarEntity } from '../models/access-status.enum';
import { agendaSchema, calendarAccessSchema, writeResultSchema } from '../models/eventkit.schema';
import type { Agenda, CalendarAccess, EventPayload, ReminderPayload, WriteResult } from '../models/eventkit.schema';

/** Input travels as one JSON argument so user text never becomes script source. */
async function runEventKit<T>(script: string, input: unknown, schema: z.ZodType<T>): Promise<T> {
  const stdout = await runAppleScript(script, { language: 'JavaScript', args: [JSON.stringify(input)] });

  return schema.parse(JSON.parse(stdout));
}

export async function getCalendarAccess(): Promise<CalendarAccess> {
  return runEventKit(ACCESS_JXA, { mode: 'read' }, calendarAccessSchema);
}

export async function requestCalendarAccess(entity: CalendarEntity): Promise<AccessStatus> {
  return runEventKit(ACCESS_JXA, { mode: 'request', entity }, accessStatusSchema);
}

/**
 * The preview warns when a repeat can't be applied, and it only reads access so typing never pops a macOS prompt.
 * A failed read counts as no access, since it only changes that warning.
 */
export async function hasFullAccess(entity: CalendarEntity): Promise<boolean> {
  try {
    const access = await getCalendarAccess();
    return access[entity] === AccessStatus.FullAccess;
  } catch {
    return false;
  }
}

/**
 * Repeats, time zones and alerts can only be saved through EventKit, not AppleScript, and EventKit needs the user's
 * permission. Asks the first time; false means the caller falls back to AppleScript.
 */
export async function ensureEventKitAccess(entity: CalendarEntity): Promise<boolean> {
  const status = await requestCalendarAccess(entity);
  return status === AccessStatus.FullAccess;
}

export async function readAgenda(input: AgendaInput): Promise<Agenda> {
  return runEventKit(AGENDA_JXA, input, agendaSchema);
}

export async function createEventWithEventKit(payload: EventPayload): Promise<WriteResult> {
  return runEventKit(CREATE_EVENT_JXA, payload, writeResultSchema);
}

export async function createReminderWithEventKit(payload: ReminderPayload): Promise<WriteResult> {
  return runEventKit(CREATE_REMINDER_JXA, payload, writeResultSchema);
}
