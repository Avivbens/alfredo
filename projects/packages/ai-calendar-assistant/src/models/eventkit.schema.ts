import { z } from 'zod';
import { AccessRoute, CalendarEntity, accessStatusSchema } from './access-status.enum';

export const calendarAccessSchema = z.object({
  event: accessStatusSchema,
  reminder: accessStatusSchema,
});

export const agendaEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  calendar: z.string(),
  location: z.string().optional(),
  allDay: z.boolean(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  startLabel: z.string(),
  endLabel: z.string(),
});

export const agendaReminderSchema = z.object({
  id: z.string(),
  title: z.string(),
  list: z.string(),
  due: z.coerce.date(),
  hasTime: z.boolean(),
  timeLabel: z.string(),
  weekdayLabel: z.string(),
  dateLabel: z.string(),
});

export const agendaSchema = z.object({
  events: z.array(agendaEventSchema),
  reminders: z.array(agendaReminderSchema),
});

export const agendaIssueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('needs-access'),
    entity: z.enum(CalendarEntity),
    route: z.enum(AccessRoute),
  }),
  z.object({ kind: z.literal('failed'), reason: z.string() }),
]);

export const agendaActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('open-event'), id: z.string() }),
  z.object({ kind: z.literal('show-list'), list: z.string() }),
  z.object({ kind: z.literal('request-access'), entity: z.enum(CalendarEntity) }),
  z.object({ kind: z.literal('open-settings'), entity: z.enum(CalendarEntity) }),
]);

export type CalendarAccess = z.infer<typeof calendarAccessSchema>;
export type AgendaEvent = z.infer<typeof agendaEventSchema>;
export type AgendaReminder = z.infer<typeof agendaReminderSchema>;
export type Agenda = z.infer<typeof agendaSchema>;
export type AgendaIssue = z.infer<typeof agendaIssueSchema>;
export type AgendaAction = z.infer<typeof agendaActionSchema>;
