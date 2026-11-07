import { describe, expect, it } from 'vitest';
import { toRouteLabel } from './route.util';

describe('route.util', () => {
  describe('toRouteLabel', () => {
    it('should read the label of the open route back from the input', () => {
      expect(toRouteLabel('› Tel Aviv', '')).toBe('Tel Aviv');
      expect(toRouteLabel('› Tel Aviv ', '')).toBe('Tel Aviv');
    });

    it('should keep a suffix that made the label unique, and leave out the filter', () => {
      expect(toRouteLabel('› Paris (2) tom', 'tom')).toBe('Paris (2)');
      expect(toRouteLabel('› Paris (2) 2', '2')).toBe('Paris (2)');
    });
  });
});
