import { describe, expect, it } from 'vitest';
import { pluralize } from './text.util';

describe('text.util', () => {
  describe('pluralize', () => {
    it.each([
      [1, '1 worktree'],
      [2, '2 worktrees'],
    ] as const)('should count %i as %s', (count, text) => {
      expect(pluralize(count, 'worktree')).toBe(text);
    });
  });
});
