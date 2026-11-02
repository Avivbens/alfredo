import { describe, expect, it } from 'vitest';
import { parsePrRef } from './pr-ref.util';

describe('pr-ref.util', () => {
  describe('parsePrRef', () => {
    it('should parse a pull request URL, ignoring a trailing tab, fragment or query', () => {
      const expected = { nameWithOwner: 'avivbens/alfredo', number: 12 };

      expect(parsePrRef('https://github.com/Avivbens/alfredo/pull/12')).toEqual(expected);
      expect(parsePrRef('https://github.com/Avivbens/alfredo/pull/12/files')).toEqual(expected);
      expect(parsePrRef('https://github.com/Avivbens/alfredo/pull/12/commits')).toEqual(expected);
      expect(parsePrRef('https://github.com/Avivbens/alfredo/pull/12#issuecomment-1')).toEqual(expected);
      expect(parsePrRef('https://github.com/Avivbens/alfredo/pull/12?diff=split')).toEqual(expected);
    });

    it('should parse the owner/repo#123 form', () => {
      expect(parsePrRef('Avivbens/alfredo#7')).toEqual({ nameWithOwner: 'avivbens/alfredo', number: 7 });
    });

    it('should reject plain text, other hosts and non-pull URLs', () => {
      expect(parsePrRef('hello')).toBeNull();
      expect(parsePrRef('alfredo#7')).toBeNull();
      expect(parsePrRef('https://gitlab.com/a/b/pull/1')).toBeNull();
      expect(parsePrRef('https://github.com/a/b/issues/1')).toBeNull();
    });
  });
});
