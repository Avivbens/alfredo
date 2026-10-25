import { describe, expect, it } from 'vitest';
import { pluralize, stripPrefix } from './text.util';

describe('text.util', () => {
  describe('stripPrefix', () => {
    it('should strip the prefix only when the text starts with it', () => {
      expect(stripPrefix('ref: refs/heads/main', 'ref: ')).toBe('refs/heads/main');
      expect(stripPrefix('main', 'ref: ')).toBe('main');
    });
  });

  describe('pluralize', () => {
    it.each([
      [1, '1 worktree'],
      [2, '2 worktrees'],
    ] as const)('should count %i as %s', (count, text) => {
      expect(pluralize(count, 'worktree')).toBe(text);
    });
  });
});
