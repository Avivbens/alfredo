import { describe, expect, it } from 'vitest';
import { stripPrefix } from './strip-prefix';

describe('strip-prefix', () => {
  describe('stripPrefix', () => {
    it('should strip the prefix only when the text starts with it', () => {
      expect(stripPrefix('ref: refs/heads/main', 'ref: ')).toBe('refs/heads/main');
      expect(stripPrefix('main', 'ref: ')).toBe('main');
    });
  });
});
