import { describe, expect, it } from 'vitest';
import { Reminder } from '../models/reminder.model';
import {
  RECURRENCE_UNSUPPORTED_NOTE,
  buildReminderDueLabel,
  buildReminderPreview,
  buildReminderSubtitle,
} from './reminder-preview.service';

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

      expect(buildReminderPreview(reminder, { repeatApplies: false })).toBe(
        'Renew the domain\n\nWhen: Due Tomorrow, 18:00\n\nRegistrar: Namecheap',
      );
    });

    it('should omit the notes block when there are no notes', () => {
      const reminder: Reminder = { title: 'Buy milk', allDay: false };

      expect(buildReminderPreview(reminder, { repeatApplies: false })).toBe('Buy milk\n\nWhen: No due date');
    });

    const repeatingReminder: Reminder = {
      title: 'Buy a flight ticket to Amsterdam',
      dueDate: at(13, 0, 1),
      allDay: false,
      recurrence: 'every week on Sunday and Monday',
      recurrenceRule: { frequency: 'weekly', interval: 1, daysOfWeek: ['sunday', 'monday'] },
    };

    it('should hide the unsupported note when the repeat applies', () => {
      expect(buildReminderPreview(repeatingReminder, { repeatApplies: true })).toBe(
        [
          'Buy a flight ticket to Amsterdam',
          '',
          'When: Due Tomorrow, 13:00',
          'Repeat: every week on Sunday and Monday',
        ].join('\n'),
      );
    });

    it('should show the unsupported note on the fallback, where the repeat only lands in the notes', () => {
      expect(buildReminderPreview(repeatingReminder, { repeatApplies: false })).toBe(
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

  describe('buildReminderSubtitle', () => {
    const reminder: Reminder = {
      title: 'Water the plants',
      dueDate: at(9, 30, 1),
      allDay: false,
      notes: 'The ones on the balcony',
      recurrence: 'every day',
      recurrenceRule: { frequency: 'daily', interval: 1 },
    };

    it('should say the reminder repeats when the repeat applies', () => {
      expect(buildReminderSubtitle(reminder, { repeatApplies: true })).toBe('Due Tomorrow, 9:30 | Repeats every day');
    });

    it('should warn on the fallback, so a reminder that will not repeat cannot look like one that will', () => {
      expect(buildReminderSubtitle(reminder, { repeatApplies: false })).toBe(
        `Due Tomorrow, 9:30 | ${RECURRENCE_UNSUPPORTED_NOTE}`,
      );
    });

    it('should show the notes when nothing repeats', () => {
      const single: Reminder = {
        title: 'Water the plants',
        dueDate: at(9, 30, 1),
        allDay: false,
        notes: 'The ones on the balcony',
      };

      expect(buildReminderSubtitle(single, { repeatApplies: false })).toBe(
        'Due Tomorrow, 9:30 | The ones on the balcony',
      );
    });

    it('should say so when there are no notes either', () => {
      expect(buildReminderSubtitle({ title: 'Buy milk', allDay: false }, { repeatApplies: false })).toBe(
        'No due date | No notes',
      );
    });
  });
});
