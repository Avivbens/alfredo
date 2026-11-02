import { toAccessRoute } from '../common/access.util';
import { toFailureMessage } from '../common/failure-message.util';
import { AccessRoute, AccessStatus, CalendarEntity } from '../models/access-status.enum';
import type { Agenda, AgendaIssue } from '../models/eventkit.schema';
import { getCalendarAccess, readAgenda } from './eventkit.service';

type AgendaSettings = { calendars: string[]; showReminders: boolean };

const EMPTY_AGENDA: Agenda = { events: [], reminders: [] };

function toAccessIssue(entity: CalendarEntity, status: AccessStatus): AgendaIssue[] {
  const route = toAccessRoute(status);

  return route === AccessRoute.EventKit ? [] : [{ kind: 'needs-access', entity, route }];
}

/**
 * Never throws: the workflow must render something even when EventKit fails. readAgenda reads events
 * unconditionally, so without event access nothing is read and both needed issues are reported.
 */
export async function loadAgenda(settings: AgendaSettings): Promise<{ agenda: Agenda; issues: AgendaIssue[] }> {
  try {
    const access = await getCalendarAccess();
    const issues = [
      ...toAccessIssue(CalendarEntity.Event, access.event),
      ...(settings.showReminders ? toAccessIssue(CalendarEntity.Reminder, access.reminder) : []),
    ];

    if (access.event !== AccessStatus.FullAccess) {
      return { agenda: EMPTY_AGENDA, issues };
    }

    const includeReminders = settings.showReminders && access.reminder === AccessStatus.FullAccess;
    const agenda = await readAgenda({ calendars: settings.calendars, includeReminders });

    return { agenda, issues };
  } catch (error) {
    return { agenda: EMPTY_AGENDA, issues: [{ kind: 'failed', reason: toFailureMessage(error) }] };
  }
}
