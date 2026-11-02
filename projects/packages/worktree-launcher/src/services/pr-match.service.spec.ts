import { describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../models/clone.schema';
import type { PullRequest } from '../models/pull-request.schema';
import { loadPrStates, toPrStates, toSearchText } from './pr-match.service';

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
  describe('toPrStates', () => {
    it('should match a PR to the worktree on its branch', () => {
      const login: Worktree = { path: '/work/app@login', branch: 'feat/login' };
      const checkouts = { [APP.path]: [{ path: APP.path, branch: 'master' }, login] };

      expect(toPrStates([toPr()], [APP], checkouts)).toEqual([{ pr: toPr(), clone: APP, worktree: login }]);
    });

    it('should match a fork PR to pr-<n>, not to its head branch', () => {
      const fork = toPr({ isCrossRepository: true, headRefName: 'master' });
      const review: Worktree = { path: '/work/app@pr-7', branch: 'pr-7' };
      const checkouts = { [APP.path]: [{ path: APP.path, branch: 'master' }, review] };

      expect(toPrStates([fork], [APP], checkouts)).toEqual([{ pr: fork, clone: APP, worktree: review }]);
    });

    it('should keep the clone and leave the worktree empty when the branch is not checked out', () => {
      const checkouts = { [APP.path]: [{ path: APP.path, branch: 'master' }] };

      expect(toPrStates([toPr()], [APP], checkouts)).toEqual([{ pr: toPr(), clone: APP }]);
    });

    it('should search by title, repo and #number', () => {
      expect(toSearchText(toPr())).toBe('Add login owner/app #7');
    });

    it('should leave both empty when no clone has the repo', () => {
      expect(toPrStates([toPr()], [], {})).toEqual([{ pr: toPr() }]);
    });

    it('should prefer the clone that has the branch checked out', () => {
      const longer: Clone = { path: '/work/archive/app', nameWithOwner: 'owner/app' };
      const login: Worktree = { path: '/work/archive/app@login', branch: 'feat/login' };
      const checkouts = { [APP.path]: [], [longer.path]: [login] };

      expect(toPrStates([toPr()], [APP, longer], checkouts)[0]).toMatchObject({ clone: longer, worktree: login });
    });

    it('should fall back to the shortest path when no clone has the branch', () => {
      const longer: Clone = { path: '/work/archive/app', nameWithOwner: 'owner/app' };

      expect(toPrStates([toPr()], [longer, APP], {})[0]).toMatchObject({ clone: APP });
    });

    it('should list a PR that is both mine and a review request once, as mine', () => {
      const mine = toPr();
      const review = toPr({ source: 'review' });

      const states = toPrStates([review, mine], [APP], {});

      expect(states.map(({ pr }) => pr.source)).toEqual(['mine']);
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
