import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessRoute, AccessStatus, CalendarEntity } from '../models/access-status.enum';
import type { Agenda } from '../models/eventkit.schema';
import { loadAgenda } from './agenda-loader.service';

const { getCalendarAccess, readAgenda } = vi.hoisted(() => ({
  getCalendarAccess: vi.fn(),
  readAgenda: vi.fn(),
}));
vi.mock('./eventkit.service', () => ({ getCalendarAccess, readAgenda }));

describe('agenda-loader.service', () => {
  const agenda: Agenda = {
    events: [
      {
        id: 'e1',
        title: 'Standup',
        calendar: 'Work',
        allDay: false,
        start: new Date('2026-11-02T09:00:00.000Z'),
        end: new Date('2026-11-02T09:15:00.000Z'),
        startLabel: '9:00 AM',
        endLabel: '9:15 AM',
      },
    ],
    reminders: [],
  };
  const settings = { calendars: ['Work'], showReminders: true };

  beforeEach(() => {
    vi.resetAllMocks();
    readAgenda.mockResolvedValue(agenda);
  });

  describe('loadAgenda', () => {
    it('should read both when both are granted', async () => {
      getCalendarAccess.mockResolvedValue({ event: AccessStatus.FullAccess, reminder: AccessStatus.FullAccess });

      const result = await loadAgenda(settings);

      expect(readAgenda).toHaveBeenCalledWith({ calendars: ['Work'], includeReminders: true });
      expect(result).toEqual({ agenda, issues: [] });
    });

    it('should still return events with a reminders issue when only events are granted', async () => {
      getCalendarAccess.mockResolvedValue({ event: AccessStatus.FullAccess, reminder: AccessStatus.Denied });

      const result = await loadAgenda(settings);

      expect(readAgenda).toHaveBeenCalledWith({ calendars: ['Work'], includeReminders: false });
      expect(result.agenda).toEqual(agenda);
      expect(result.issues).toEqual([
        { kind: 'needs-access', entity: CalendarEntity.Reminder, route: AccessRoute.Settings },
      ]);
    });

    it('should skip reminders entirely when the setting is off', async () => {
      getCalendarAccess.mockResolvedValue({ event: AccessStatus.FullAccess, reminder: AccessStatus.NotDetermined });

      const result = await loadAgenda({ ...settings, showReminders: false });

      expect(readAgenda).toHaveBeenCalledWith({ calendars: ['Work'], includeReminders: false });
      expect(result.issues).toEqual([]);
    });

    it('should report needed access without reading when events are not granted', async () => {
      getCalendarAccess.mockResolvedValue({ event: AccessStatus.NotDetermined, reminder: AccessStatus.Denied });

      const result = await loadAgenda(settings);

      expect(readAgenda).not.toHaveBeenCalled();
      expect(result.agenda).toEqual({ events: [], reminders: [] });
      expect(result.issues).toEqual([
        { kind: 'needs-access', entity: CalendarEntity.Event, route: AccessRoute.Request },
        { kind: 'needs-access', entity: CalendarEntity.Reminder, route: AccessRoute.Settings },
      ]);
    });

    it('should turn a JXA failure into a failed issue', async () => {
      getCalendarAccess.mockResolvedValue({ event: AccessStatus.FullAccess, reminder: AccessStatus.FullAccess });
      readAgenda.mockRejectedValue(Object.assign(new Error('boom'), { stderr: '  execution error  ' }));

      const result = await loadAgenda(settings);

      expect(result.agenda).toEqual({ events: [], reminders: [] });
      expect(result.issues).toEqual([{ kind: 'failed', reason: 'execution error' }]);
    });

    it('should fall back to the error message when there is no stderr', async () => {
      getCalendarAccess.mockRejectedValue(new Error('boom'));

      const result = await loadAgenda(settings);

      expect(result.issues).toEqual([{ kind: 'failed', reason: 'boom' }]);
    });
  });
});
