import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { runAppleScript } from '@alfredo/run-applescript';
import { ACCESS_JXA } from '../common/jxa/access.jxa';
import { AGENDA_JXA } from '../common/jxa/agenda.jxa';
import { AccessStatus, CalendarEntity } from '../models/access-status.enum';
import { getCalendarAccess, readAgenda, requestCalendarAccess } from './eventkit.service';

vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

/** Shape of AGENDA_JXA output on macOS 26, with ids, titles and dates replaced. */
const AGENDA_OUTPUT = {
  events: [
    {
      id: 'event-1',
      title: 'Standup',
      calendar: 'Work',
      location: 'Room 4',
      allDay: false,
      start: '2026-11-02T07:30:00.000Z',
      end: '2026-11-02T08:00:00.000Z',
      startLabel: '9:30',
      endLabel: '10:00',
    },
    {
      id: 'event-2',
      title: 'Holiday',
      calendar: 'Home',
      allDay: true,
      start: '2026-11-01T22:00:00.000Z',
      end: '2026-11-02T21:59:59.000Z',
      startLabel: '0:00',
      endLabel: '23:59',
    },
  ],
  reminders: [
    {
      id: 'reminder-1',
      title: 'Pay rent',
      list: 'Home',
      due: '2026-10-28T22:00:00.000Z',
      hasTime: false,
      timeLabel: '0:00',
      weekdayLabel: 'Thu',
      dateLabel: '29 Oct',
    },
  ],
};

describe('eventkit.service', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('readAgenda', () => {
    it('should run JXA with the input as a single JSON argument', async () => {
      vi.mocked(runAppleScript).mockResolvedValue('{"events":[],"reminders":[]}');

      await readAgenda({ calendars: ['Work'], includeReminders: true });

      expect(runAppleScript).toHaveBeenCalledWith(AGENDA_JXA, {
        language: 'JavaScript',
        args: ['{"calendars":["Work"],"includeReminders":true}'],
      });
    });

    it('should parse the agenda output', async () => {
      vi.mocked(runAppleScript).mockResolvedValue(JSON.stringify(AGENDA_OUTPUT));

      const agenda = await readAgenda({ calendars: [], includeReminders: true });

      expect(agenda.events).toHaveLength(2);
      expect(agenda.events[0]).toMatchObject({ id: 'event-1', location: 'Room 4', allDay: false });
      expect(agenda.events[0]?.start).toEqual(new Date('2026-11-02T07:30:00.000Z'));
      expect(agenda.events[1]?.location).toBeUndefined();
      expect(agenda.reminders[0]).toMatchObject({ id: 'reminder-1', list: 'Home', hasTime: false });
      expect(agenda.reminders[0]?.due).toEqual(new Date('2026-10-28T22:00:00.000Z'));
    });

    it('should reject output that fails the schema', async () => {
      vi.mocked(runAppleScript).mockResolvedValue('{"events":[{"id":"event-1"}],"reminders":[]}');

      await expect(readAgenda({ calendars: [], includeReminders: false })).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe('getCalendarAccess', () => {
    it('should read both statuses in read mode', async () => {
      vi.mocked(runAppleScript).mockResolvedValue('{"event":3,"reminder":0}');

      const access = await getCalendarAccess();

      expect(runAppleScript).toHaveBeenCalledWith(ACCESS_JXA, { language: 'JavaScript', args: ['{"mode":"read"}'] });
      expect(access).toEqual({ event: AccessStatus.FullAccess, reminder: AccessStatus.NotDetermined });
    });
  });

  describe('requestCalendarAccess', () => {
    it('should ask for the requested entity', async () => {
      vi.mocked(runAppleScript).mockResolvedValue('3');

      const status = await requestCalendarAccess(CalendarEntity.Reminder);

      expect(runAppleScript).toHaveBeenCalledWith(ACCESS_JXA, {
        language: 'JavaScript',
        args: ['{"mode":"request","entity":"reminder"}'],
      });
      expect(status).toBe(AccessStatus.FullAccess);
    });
  });
});
