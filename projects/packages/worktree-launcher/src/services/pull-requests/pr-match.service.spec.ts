import { describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import { loadCheckouts, loadPrStates } from './pr-match.service';

const { getCheckouts } = vi.hoisted(() => ({ getCheckouts: vi.fn() }));

vi.mock('@alfredo/git-worktrees', () => ({ getCheckouts }));

const APP: Clone = { path: '/work/app', nameWithOwner: 'owner/app' };

function toPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 7,
    title: 'Add login',
    url: 'https://github.com/owner/app/pull/7',
    isDraft: false,
    headRefName: 'feat/login',
    isCrossRepository: false,
    nameWithOwner: 'owner/app',
    source: 'mine',
    ...overrides,
  };
}

describe('pr-match.service', () => {
  describe('loadCheckouts', () => {
    it('should read each clone of a listed repo once, keyed by its path', async () => {
      const archive: Clone = { path: '/work/archive/app', nameWithOwner: 'owner/app' };
      const other: Clone = { path: '/work/other', nameWithOwner: 'owner/other' };
      getCheckouts.mockImplementation(async (path: string) => [{ path, branch: 'master' }]);

      const checkouts = await loadCheckouts([toPr(), toPr({ number: 8 })], [APP, archive, other]);

      expect(getCheckouts).toHaveBeenCalledTimes(2);
      expect(checkouts).toEqual({
        [APP.path]: [{ path: APP.path, branch: 'master' }],
        [archive.path]: [{ path: archive.path, branch: 'master' }],
      });
    });
  });

  describe('loadPrStates', () => {
    it('should read the checkouts of the matching clones only', async () => {
      const other: Clone = { path: '/work/other', nameWithOwner: 'owner/other' };
      const login: Worktree = { path: '/work/app@login', branch: 'feat/login' };
      getCheckouts.mockResolvedValue([login]);

      const states = await loadPrStates([toPr()], [APP, other]);

      expect(getCheckouts).toHaveBeenCalledTimes(1);
      expect(getCheckouts).toHaveBeenCalledWith(APP.path);
      expect(states).toEqual([{ pr: toPr(), clone: APP, worktree: login }]);
    });
  });
});
