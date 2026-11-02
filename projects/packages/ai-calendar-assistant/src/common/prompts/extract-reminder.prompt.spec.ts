import { describe, expect, it } from 'vitest';
import { EXTRACT_REMINDER_SYSTEM_PROMPT } from './extract-reminder.prompt';

describe('EXTRACT_REMINDER_SYSTEM_PROMPT', () => {
  it('should format with literal single braces in the recurrenceRule examples', async () => {
    const text = await EXTRACT_REMINDER_SYSTEM_PROMPT.format({ currentDate: '2026-08-13' });

    expect(text).toContain('recurrenceRule: { frequency: "weekly", interval: 1, daysOfWeek: ["sunday", "monday"] }');
    expect(text).toContain('recurrenceRule: { frequency: "daily", interval: 1 }');
    expect(text).toContain('recurrenceRule: { frequency: "weekly", interval: 1, daysOfWeek: ["thursday"] }');
    expect(text).toContain('{ count }');
    expect(text).not.toContain('{{');
  });
});
