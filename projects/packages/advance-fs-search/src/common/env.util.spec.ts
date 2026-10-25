import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { parseFlag, parsePaths } from './env.util';

describe('env.util', () => {
  describe('parseFlag', () => {
    it('should read the 1 or 0 Alfred stores for a checkbox', () => {
      expect(parseFlag('1')).toBe(true);
      expect(parseFlag('0')).toBe(false);
    });
  });

  describe('parsePaths', () => {
    it('should read one path per line, skipping blank lines and expanding ~', () => {
      expect(parsePaths('~/dev\n\n/opt/work\n')).toEqual([`${homedir()}/dev`, '/opt/work']);
    });
  });
});
