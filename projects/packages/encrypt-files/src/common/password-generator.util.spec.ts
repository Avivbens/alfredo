import { describe, expect, it } from 'vitest';
import { generatePassword } from './password-generator.util';

describe('password-generator.util', () => {
  describe('generatePassword', () => {
    it('should make three groups of six unambiguous letters and digits', () => {
      const passwords = Array.from({ length: 200 }, () => generatePassword());

      for (const password of passwords) {
        expect(password).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{6}-[A-HJ-NP-Za-km-np-z2-9]{6}-[A-HJ-NP-Za-km-np-z2-9]{6}$/);
      }
    });

    it('should make a different password every time', () => {
      const passwords = Array.from({ length: 100 }, () => generatePassword());

      expect(new Set(passwords).size).toBe(100);
    });
  });
});
