import type { z } from 'zod';
import { runAppleScript } from '@alfredo/run-applescript';
import { ACCESS_JXA } from '../common/jxa/access.jxa';
import { AGENDA_JXA } from '../common/jxa/agenda.jxa';
import type { AgendaInput } from '../common/jxa/agenda.jxa';
import { accessStatusSchema } from '../models/access-status.enum';
import type { AccessStatus, CalendarEntity } from '../models/access-status.enum';
import { agendaSchema, calendarAccessSchema } from '../models/eventkit.schema';
import type { Agenda, CalendarAccess } from '../models/eventkit.schema';

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

export async function readAgenda(input: AgendaInput): Promise<Agenda> {
  return runEventKit(AGENDA_JXA, input, agendaSchema);
}
