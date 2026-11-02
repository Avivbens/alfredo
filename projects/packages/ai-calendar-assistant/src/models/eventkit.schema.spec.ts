import { describe, expect, it } from 'vitest';
import { calendarAccessSchema } from './eventkit.schema';

describe('eventkit.schema', () => {
  describe('calendarAccessSchema', () => {
    it('should reject an unknown status', () => {
      expect(calendarAccessSchema.safeParse({ event: 7, reminder: 0 }).success).toBe(false);
    });
  });
});
