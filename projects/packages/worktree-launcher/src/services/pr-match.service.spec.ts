import { matches } from 'fast-alfred';
import { describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../models/clone.schema';
import type { PullRequest } from '../models/pull-request.schema';
import { loadCheckouts, loadPrStates, toPrStates, toSearchText } from './pr-match.service';

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

    it('should keep one entry per PR, preferring mine, then review, then assigned', () => {
      const prs = [toPr({ source: 'assigned' }), toPr({ source: 'review' }), toPr({ source: 'mine' })];

      const states = toPrStates(prs, [APP], {});

      expect(states.map(({ pr }) => pr.source)).toEqual(['mine']);
    });

    it('should prefer your own entry over the same PR from a stack', () => {
      const stacked = toPr({ source: 'stack', stack: { number: 68, size: 5, position: 2 } });

      const states = toPrStates([stacked, toPr({ source: 'mine' })], [APP], {});

      expect(states.map(({ pr }) => pr.source)).toEqual(['mine']);
    });

    it('should keep the review entry over an assigned one', () => {
      const states = toPrStates([toPr({ source: 'assigned' }), toPr({ source: 'review' })], [APP], {});

      expect(states.map(({ pr }) => pr.source)).toEqual(['review']);
    });
  });

  describe('toSearchText', () => {
    it('should search by title, repo, #number and branch', () => {
      expect(toSearchText(toPr())).toBe('Add login owner/app #7 feat/login');
    });

    it('should match the branch name when typing', () => {
      const pr = toPr({ headRefName: 'POC-29991/schedule-refresh' });

      expect(matches('POC-29991/schedule-refresh', [pr], toSearchText)).toEqual([pr]);
    });

    it('should add the stack number to a stacked PR', () => {
      const pr = toPr({ stack: { number: 68, size: 5, position: 2 } });

      expect(toSearchText(pr)).toBe('Add login owner/app #7 feat/login stack 68');
    });

    it('should keep every layer of a stack when typing its number', () => {
      const layers = [1, 2, 3].map((position) =>
        toPr({ number: 60 + position, stack: { number: 68, size: 3, position } }),
      );
      const other = toPr({ number: 71, stack: { number: 70, size: 1, position: 1 } });

      expect(matches('stack 68', [toPr(), ...layers, other], toSearchText)).toEqual(layers);
    });
  });

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
