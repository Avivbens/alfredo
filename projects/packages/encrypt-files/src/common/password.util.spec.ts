import { describe, expect, it } from 'vitest';
import { checkPassword } from './password.util';

describe('password.util', () => {
  describe('checkPassword', () => {
    it.each([
      ['short', undefined, 'too-short'],
      ['1234567', undefined, 'too-short'],
      ['12345678', undefined, null],
      ['long-enough', 'long-enougH', 'mismatch'],
      ['long-enough', 'long-enough', null],
    ])('should rate %j confirmed as %j as %j', (first, second, expected) => {
      const issue = checkPassword(first, second);

      expect(issue).toBe(expected);
    });
  });
});
