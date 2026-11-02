import { describe, expect, it } from 'vitest';
import type { PullRequest } from '../models/pull-request.schema';
import { pickFreePath, toLocalBranch, toWorktreeName, toWorktreePath } from './worktree-name.util';

const PR: PullRequest = {
  number: 42,
  title: 'Add agenda view',
  url: 'https://github.com/owner/repo/pull/42',
  isDraft: false,
  headRefName: 'feat/agenda-view',
  isCrossRepository: false,
  nameWithOwner: 'owner/repo',
  source: 'mine',
};

describe('worktree-name.util', () => {
  describe('toWorktreeName', () => {
    it.each([
      ['feat/agenda-view', 'agenda-view'],
      ['fix/crash', 'crash'],
      ['migration/users', 'users'],
      ['feat/ui/button', 'ui-button'],
      ['dependabot/npm_and_yarn/zod-4.1', 'dependabot-npm_and_yarn-zod-4.1'],
      ['main', 'main'],
    ])('should turn %s into %s', (branch, name) => {
      expect(toWorktreeName(branch)).toBe(name);
    });
  });

  describe('toLocalBranch', () => {
    it('should keep the head ref for a same-repo PR', () => {
      expect(toLocalBranch(PR)).toBe('feat/agenda-view');
    });

    it('should give pr-<number> for a fork PR', () => {
      expect(toLocalBranch({ ...PR, isCrossRepository: true })).toBe('pr-42');
    });
  });

  describe('toWorktreePath', () => {
    it('should put the worktree next to the clone', () => {
      expect(toWorktreePath('~/dev/alfredo', 'agenda-view')).toBe('~/dev/alfredo@agenda-view');
    });

    it('should ignore a trailing slash on the clone path', () => {
      expect(toWorktreePath('/Users/me/dev/alfredo/', 'agenda-view')).toBe('/Users/me/dev/alfredo@agenda-view');
    });
  });

  describe('pickFreePath', () => {
    it('should return the base when it is free', async () => {
      await expect(pickFreePath('/w/a@x', () => Promise.resolve(false))).resolves.toBe('/w/a@x');
    });

    it('should add -2 when the folder is taken by something else', async () => {
      const taken = new Set(['/w/a@x']);

      await expect(pickFreePath('/w/a@x', (path) => Promise.resolve(taken.has(path)))).resolves.toBe('/w/a@x-2');
    });

    it('should add -3 when -2 is taken too', async () => {
      const taken = new Set(['/w/a@x', '/w/a@x-2']);

      await expect(pickFreePath('/w/a@x', (path) => Promise.resolve(taken.has(path)))).resolves.toBe('/w/a@x-3');
    });

    it('should throw instead of looping forever when everything is taken', async () => {
      await expect(pickFreePath('/w/a@x', () => Promise.resolve(true))).rejects.toThrow(/no free folder/i);
    });
  });
});
