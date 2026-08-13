import { Reminder } from '../models/reminder.model';
import { RECURRENCE_UNSUPPORTED_NOTE, buildReminderDueLabel, buildReminderPreview } from './reminder-preview.service';

describe('reminder-preview.service', () => {
  /**
   * `beautifyDate` renders relative labels against the real clock, so the
   * fixtures are built from today rather than from a frozen date.
   */
  const at = (hours: number, minutes = 0, dayOffset = 0): Date => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, minutes, 0, 0);

    return date;
  };

  describe('buildReminderDueLabel', () => {
    it('should report a timed reminder with its time', () => {
      const reminder: Reminder = { title: 'Call the bank', dueDate: at(9, 30, 1), allDay: false };

      expect(buildReminderDueLabel(reminder)).toBe('Due Tomorrow, 9:30');
    });

    it('should drop the time from an all-day reminder but keep the day label', () => {
      const reminder: Reminder = { title: 'Buy milk', dueDate: at(0, 0, 1), allDay: true };

      expect(buildReminderDueLabel(reminder)).toBe('Due Tomorrow (all day)');
    });

    it('should say so when there is no due date at all', () => {
      expect(buildReminderDueLabel({ title: 'Buy milk', allDay: false })).toBe('No due date');
    });
  });

  describe('buildReminderPreview', () => {
    it('should lay out the title, the due label and the notes', () => {
      const reminder: Reminder = {
        title: 'Renew the domain',
        dueDate: at(18, 0, 1),
        allDay: false,
        notes: 'Registrar: Namecheap',
      };

      expect(buildReminderPreview(reminder)).toBe(
        'Renew the domain\n\nWhen: Due Tomorrow, 18:00\n\nRegistrar: Namecheap',
      );
    });

    it('should omit the notes block when there are no notes', () => {
      const reminder: Reminder = { title: 'Buy milk', allDay: false };

      expect(buildReminderPreview(reminder)).toBe('Buy milk\n\nWhen: No due date');
    });

    it('should spell out that a requested repetition will not be applied', () => {
      const reminder: Reminder = {
        title: 'Buy a flight ticket to Amsterdam',
        dueDate: at(13, 0, 1),
        allDay: false,
        recurrence: 'every week on Sunday and Monday',
      };

      expect(buildReminderPreview(reminder)).toBe(
        [
          'Buy a flight ticket to Amsterdam',
          '',
          'When: Due Tomorrow, 13:00',
          'Repeat: every week on Sunday and Monday',
          RECURRENCE_UNSUPPORTED_NOTE,
        ].join('\n'),
      );
    });
  });
});
