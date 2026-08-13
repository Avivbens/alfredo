import { GeminiReminderSchema, OpenAIReminderSchema } from './reminder.model';

describe('reminder.model', () => {
  describe('GeminiReminderSchema', () => {
    it('should keep a timed due date as-is and mark it as not all-day', () => {
      const result = GeminiReminderSchema.parse({ title: 'Call the bank', dueDate: '2026-08-14T09:00:00' });

      expect(result.allDay).toBe(false);
      expect(result.dueDate).toEqual(new Date(2026, 7, 14, 9, 0, 0));
    });

    it('should derive allDay from a date-only value and anchor it to local midnight', () => {
      const result = GeminiReminderSchema.parse({ title: 'Buy milk', dueDate: '2026-08-14' });

      expect(result.allDay).toBe(true);
      expect(result.dueDate).toEqual(new Date(2026, 7, 14, 0, 0, 0));
    });

    it('should honour an explicit allDay flag and drop the time component', () => {
      const result = GeminiReminderSchema.parse({
        title: 'Buy milk',
        dueDate: '2026-08-14T09:00:00',
        allDay: true,
      });

      expect(result.dueDate).toEqual(new Date(2026, 7, 14, 0, 0, 0));
    });

    it('should leave out the due date entirely when none was given', () => {
      const result = GeminiReminderSchema.parse({ title: 'Buy milk' });

      expect(result).toEqual({ title: 'Buy milk', allDay: false });
      expect(result.dueDate).toBeUndefined();
    });

    it('should survive a JSON round trip unchanged, as the action script re-parses its input', () => {
      const first = GeminiReminderSchema.parse({ title: 'Buy milk', dueDate: '2026-08-14' });
      const second = GeminiReminderSchema.parse(JSON.parse(JSON.stringify(first)));

      expect(second).toEqual(first);
    });

    it('should reject a due date the model made up', () => {
      expect(() => GeminiReminderSchema.parse({ title: 'Buy milk', dueDate: 'next tuesday' })).toThrow();
    });

    /**
     * "20:00 Japan time" reaches us as an offset-bearing value; it must land on
     * the absolute moment, since Reminders has no timezone of its own and fires
     * on the machine's local clock.
     */
    it('should resolve a timezone-qualified due date to the right absolute moment', () => {
      const result = GeminiReminderSchema.parse({
        title: 'Buy a flight ticket to Amsterdam',
        dueDate: '2026-08-14T20:00:00+09:00',
        allDay: false,
      });

      expect(result.allDay).toBe(false);
      expect(result.dueDate?.toISOString()).toBe('2026-08-14T11:00:00.000Z');
    });
  });

  describe('OpenAIReminderSchema', () => {
    it('should normalize nulls away instead of surfacing them downstream', () => {
      const result = OpenAIReminderSchema.parse({
        title: 'Buy milk',
        notes: null,
        dueDate: null,
        allDay: null,
      });

      expect(result).toEqual({ title: 'Buy milk', allDay: false });
    });

    it('should keep a requested repetition separate from the notes', () => {
      const result = OpenAIReminderSchema.parse({
        title: 'Buy a flight ticket to Amsterdam',
        notes: null,
        recurrence: 'every week on Sunday and Monday',
      });

      expect(result.recurrence).toBe('every week on Sunday and Monday');
      expect(result.notes).toBeUndefined();
    });

    it('should keep notes when they are provided', () => {
      const result = OpenAIReminderSchema.parse({ title: 'Renew the domain', notes: 'Registrar: Namecheap' });

      expect(result.notes).toBe('Registrar: Namecheap');
    });
  });
});
