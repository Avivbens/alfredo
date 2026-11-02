import { z } from 'zod';
import { AccessRoute, CalendarEntity, accessStatusSchema } from './access-status.enum';
import { recurrenceFrequencySchema } from './reminder.model';

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

export const eventPayloadSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  calendarName: z.string(),
  location: z.string().optional(),
  notes: z.string().optional(),
  url: z.string().optional(),
  timeZone: z.string().optional(),
  alertMinutes: z.number().int().positive().optional(),
});

/**
 * The due date travels as local components, not an instant, because EventKit tells an all-day reminder
 * by its missing hour.
 */
export const reminderPayloadSchema = z.object({
  title: z.string(),
  listName: z.string().optional(),
  notes: z.string().optional(),
  due: z
    .object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
      hour: z.number().int().min(0).max(23).optional(),
      minute: z.number().int().min(0).max(59).optional(),
    })
    .optional(),
  alarmAtDue: z.boolean(),
  recurrence: z
    .object({
      frequency: recurrenceFrequencySchema,
      interval: z.number().int().min(1),
      daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
      end: z.union([z.object({ count: z.number().int().min(1) }), z.object({ until: z.string() })]).optional(),
    })
    .optional(),
});

export const writeResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), id: z.string() }),
  z.object({
    ok: z.literal(false),
    error: z.enum(['calendar-not-found', 'list-not-found', 'save-failed']),
    detail: z.string(),
  }),
]);

export type CalendarAccess = z.infer<typeof calendarAccessSchema>;
export type AgendaEvent = z.infer<typeof agendaEventSchema>;
export type AgendaReminder = z.infer<typeof agendaReminderSchema>;
export type Agenda = z.infer<typeof agendaSchema>;
export type AgendaIssue = z.infer<typeof agendaIssueSchema>;
export type AgendaAction = z.infer<typeof agendaActionSchema>;
export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type ReminderPayload = z.infer<typeof reminderPayloadSchema>;
export type WriteResult = z.infer<typeof writeResultSchema>;
export type WriteFailure = Extract<WriteResult, { ok: false }>;
