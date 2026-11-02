import type { AlfredListItem } from 'fast-alfred';
import { AccessRoute, CalendarEntity } from '../models/access-status.enum';
import type { Agenda, AgendaAction, AgendaEvent, AgendaIssue, AgendaReminder } from '../models/eventkit.schema';

const WEEKDAY_WINDOW_DAYS = 6;
const SETTINGS_PATH_PREFIX = 'System Settings › Privacy & Security ›';
const ENTITY_COPY: Record<CalendarEntity, { noun: string; pane: string }> = {
  [CalendarEntity.Event]: { noun: 'calendars', pane: 'Calendars' },
  [CalendarEntity.Reminder]: { noun: 'reminders', pane: 'Reminders' },
};

function toArg(action: AgendaAction): string {
  return JSON.stringify(action);
}

function toIssueItem(issue: AgendaIssue): AlfredListItem {
  switch (issue.kind) {
    case 'needs-access': {
      const { noun, pane } = ENTITY_COPY[issue.entity];

      if (issue.route === AccessRoute.Request) {
        return {
          uid: `issue:request-access:${issue.entity}`,
          title: `Allow Alfred to read your ${noun}`,
          subtitle: 'Press Enter to continue',
          arg: toArg({ kind: 'request-access', entity: issue.entity }),
        };
      }

      return {
        uid: `issue:open-settings:${issue.entity}`,
        title: `Alfred can't read your ${noun}`,
        subtitle: `${SETTINGS_PATH_PREFIX} ${pane} › Alfred`,
        arg: toArg({ kind: 'open-settings', entity: issue.entity }),
      };
    }
    case 'failed':
      return {
        uid: 'issue:failed',
        title: "Couldn't read your calendar",
        subtitle: issue.reason,
        valid: false,
        text: { copy: issue.reason, largetype: issue.reason },
      };
  }
}

/** Alfred filters on match when set, so the calendar or list name must be in it for typing a name to find its rows. */
function toMatch(title: string, container: string): string {
  return `${title} ${container}`;
}

function isRunning(event: AgendaEvent, now: Date): boolean {
  return !event.allDay && event.start <= now && event.end > now;
}

function toEventItem(event: AgendaEvent, now: Date): AlfredListItem {
  const parts = event.allDay
    ? ['All day', event.calendar]
    : [`${event.startLabel} - ${event.endLabel}`, event.calendar, event.location];
  const subtitle = parts.filter((part): part is string => !!part).join(' · ');

  return {
    uid: `${event.id}:${event.start.toISOString()}`,
    title: event.title,
    match: toMatch(event.title, event.calendar),
    subtitle: isRunning(event, now) ? `Now · ${subtitle}` : subtitle,
    arg: toArg({ kind: 'open-event', id: event.id }),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Overdue starts at local midnight, so a reminder due earlier today still reads as due today. */
function isOverdue(reminder: AgendaReminder, now: Date): boolean {
  return reminder.due < startOfDay(now);
}

/** Calendar-day arithmetic keeps DST days from shifting the window by an hour. */
function isWithinWeekdayWindow(due: Date, now: Date): boolean {
  const today = startOfDay(now);

  return startOfDay(due) >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - WEEKDAY_WINDOW_DAYS);
}

function toReminderSubtitle(reminder: AgendaReminder, now: Date): string {
  if (isOverdue(reminder, now)) {
    const recent = isWithinWeekdayWindow(reminder.due, now);

    return `Overdue since ${recent ? reminder.weekdayLabel : reminder.dateLabel} · ${reminder.list}`;
  }

  return `${reminder.hasTime ? `Due ${reminder.timeLabel}` : 'Due today'} · ${reminder.list}`;
}

function toReminderItem(reminder: AgendaReminder, now: Date): AlfredListItem {
  return {
    uid: `reminder:${reminder.id}`,
    title: reminder.title,
    match: toMatch(reminder.title, reminder.list),
    subtitle: toReminderSubtitle(reminder, now),
    arg: toArg({ kind: 'show-list', list: reminder.list }),
  };
}

function byStart(a: AgendaEvent, b: AgendaEvent): number {
  return a.start.getTime() - b.start.getTime();
}

function byDue(a: AgendaReminder, b: AgendaReminder): number {
  return a.due.getTime() - b.due.getTime();
}

/** Issue rows lead so a missing permission is never buried under the rows that did load. */
export function toAgendaItems(load: { agenda: Agenda; issues: AgendaIssue[] }, now: Date): AlfredListItem[] {
  const { agenda, issues } = load;
  const allDay = agenda.events.filter((event) => event.allDay).sort(byStart);
  const timed = agenda.events.filter((event) => !event.allDay).sort(byStart);
  const reminders = [...agenda.reminders].sort(byDue);
  const items = [
    ...issues.map(toIssueItem),
    ...[...allDay, ...timed].map((event) => toEventItem(event, now)),
    ...reminders.map((reminder) => toReminderItem(reminder, now)),
  ];

  if (items.length) {
    return items;
  }

  return [{ uid: 'empty', title: 'Nothing on your calendar today', valid: false }];
}
