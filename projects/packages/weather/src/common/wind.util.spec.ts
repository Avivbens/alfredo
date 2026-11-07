import { describe, expect, it } from 'vitest';
import { toCompass } from './wind.util';

describe('wind.util', () => {
  describe('toCompass', () => {
    it('should round degrees to the nearest of 16 compass points', () => {
      expect([0, 11, 12, 225, 239, 349, 360].map(toCompass)).toEqual(['N', 'N', 'NNE', 'SW', 'WSW', 'N', 'N']);
    });
  });
});
