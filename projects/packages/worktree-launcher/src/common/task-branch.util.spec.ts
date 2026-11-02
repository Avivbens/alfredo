import { describe, expect, it } from 'vitest';
import { toTaskBranch } from './task-branch.util';

describe('task-branch.util', () => {
  describe('toTaskBranch', () => {
    it.each([
      ['Agenda view', 'feat/agenda-view'],
      ['fix/Tabs Export', 'fix/tabs-export'],
      ['migration/Move  Users', 'migration/move-users'],
      ['feat/a..b~', 'feat/a.b'],
      ['agenda\tview\n2', 'feat/agenda-view-2'],
      ['a^b:c?d*e[f\\g', 'feat/a-b-c-d-e-f-g'],
      ['a\u0000b\u007fc', 'feat/a-b-c'],
      ['Agenda - view', 'feat/agenda-view'],
      ['Agenda \u05d9\u05d5\u05de\u05df', 'feat/agenda'],
      ['  /.login./  ', 'feat/login'],
      ['fix//a/./b', 'fix/a/b'],
    ])('should turn %j into %j', (input, expected) => {
      expect(toTaskBranch(input)).toBe(expected);
    });

    it.each(['   ', '', 'fix/', '...', '~^'])('should return null when %j leaves nothing', (input) => {
      expect(toTaskBranch(input)).toBeNull();
    });

    it.each(['a@~{b', 'a@^{b', 'a@[{b', 'a@{b'])('should never leave @{ behind in %j', (input) => {
      const branch = toTaskBranch(input);

      expect(branch).toBe('feat/a-b');
      expect(branch).not.toContain('@{');
    });

    it('should never start with a dash, so git cannot read the name as an option', () => {
      expect(toTaskBranch('--force')).toBe('feat/force');
      expect(toTaskBranch('-rf')).toBe('feat/rf');
      expect(toTaskBranch('fix/-rf')).toBe('fix/rf');
    });

    it('should never end with .lock, which git refuses in a ref', () => {
      expect(toTaskBranch('x.lock')).toBe('feat/x');
      expect(toTaskBranch('feat/a.lock/b.lock')).toBe('feat/a/b');
      expect(toTaskBranch('x.lock.')).toBe('feat/x');
    });
  });
});
