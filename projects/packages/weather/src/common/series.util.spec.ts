import { describe, expect, it } from 'vitest';
import { valueAt } from './series.util';

describe('series.util', () => {
  describe('valueAt', () => {
    it('should read a value and treat a missing index like a null value', () => {
      expect(valueAt([1, null], 0)).toBe(1);
      expect(valueAt([1, null], 1)).toBeNull();
      expect(valueAt([1, null], 5)).toBeNull();
    });
  });
});
