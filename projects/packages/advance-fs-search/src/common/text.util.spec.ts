import { describe, expect, it } from 'vitest';
import { pluralize, toMemberGlyph } from './text.util';

describe('text.util', () => {
  describe('pluralize', () => {
    it.each([
      [1, '1 worktree'],
      [2, '2 worktrees'],
    ] as const)('should count %i as %s', (count, text) => {
      expect(pluralize(count, 'worktree')).toBe(text);
    });
  });

  describe('toMemberGlyph', () => {
    it.each([
      [0, 3, '│ '],
      [1, 3, '│ '],
      [2, 3, '└ '],
      [0, 1, '└ '],
    ] as const)('should give row %i of %i shown %s', (index, count, glyph) => {
      expect(toMemberGlyph(index, count)).toBe(glyph);
    });
  });
});
