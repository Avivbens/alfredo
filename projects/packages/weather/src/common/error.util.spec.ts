import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './error.util';

describe('error.util', () => {
  describe('toErrorMessage', () => {
    it('should take the message of an error and stringify anything else', () => {
      expect(toErrorMessage(new Error('fetch failed'))).toBe('fetch failed');
      expect(toErrorMessage('timeout')).toBe('timeout');
    });
  });
});
