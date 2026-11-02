import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PullRequest } from '../models/pull-request.schema';

const { loadPullRequests, lookupPullRequest } = vi.hoisted(() => ({
  loadPullRequests: vi.fn(),
  lookupPullRequest: vi.fn(),
}));

vi.mock('./pull-requests.service', () => ({ loadPullRequests, lookupPullRequest }));
vi.mock('./tools.service', () => ({ resolveTool: vi.fn().mockResolvedValue('/bin/gh') }));

const NOW = 1_000_000;

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

function toCache(stored: unknown): { get: ReturnType<typeof vi.fn>; setWithTTL: ReturnType<typeof vi.fn> } {
  return { get: vi.fn().mockReturnValue(stored), setWithTTL: vi.fn() };
}

describe('pr-search.service', () => {
  describe('loadPullRequestList', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
      loadPullRequests.mockReset();
      lookupPullRequest.mockReset();
    });

    it('should serve a match from the cache without refetching', async () => {
      const cache = toCache({ prs: [toPr()], issues: [], fetchedAt: NOW - minutesToMilliseconds(1) });
      const { loadPullRequestList } = await import('./pr-search.service');

      const result = await loadPullRequestList({ cache, input: 'login', ref: null });

      expect(result).toEqual({ all: [toPr()], matched: [toPr()], issues: [] });
      expect(loadPullRequests).not.toHaveBeenCalled();
    });

    it('should refetch once on a stale miss and use the fresh list for both all and matched', async () => {
      const assigned = toPr({ number: 9, title: 'Refresh', headRefName: 'POC-1/refresh', source: 'assigned' });
      const cache = toCache({ prs: [toPr()], issues: [], fetchedAt: NOW - secondsToMilliseconds(20) });
      loadPullRequests.mockResolvedValue({ prs: [toPr(), assigned], issues: [] });
      const { loadPullRequestList } = await import('./pr-search.service');

      const result = await loadPullRequestList({ cache, input: 'POC-1/refresh', ref: null });

      expect(loadPullRequests).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ all: [toPr(), assigned], matched: [assigned], issues: [] });
      expect(cache.setWithTTL).toHaveBeenCalledWith(
        'prs',
        { prs: [toPr(), assigned], issues: [], fetchedAt: NOW },
        { maxAge: minutesToMilliseconds(1) },
      );
    });

    it('should not refetch a miss on a list younger than ten seconds', async () => {
      const cache = toCache({ prs: [toPr()], issues: [], fetchedAt: NOW - secondsToMilliseconds(1) });
      const { loadPullRequestList } = await import('./pr-search.service');

      const result = await loadPullRequestList({ cache, input: 'nothing', ref: null });

      expect(result.matched).toEqual([]);
      expect(loadPullRequests).not.toHaveBeenCalled();
    });

    it('should look a reference up without touching the list', async () => {
      lookupPullRequest.mockResolvedValue({ prs: [toPr({ source: 'lookup' })], issues: [] });
      const cache = toCache(null);
      const { loadPullRequestList } = await import('./pr-search.service');

      const result = await loadPullRequestList({
        cache,
        input: 'owner/app#7',
        ref: { nameWithOwner: 'owner/app', number: 7 },
      });

      expect(result.matched).toEqual(result.all);
      expect(result.all).toHaveLength(1);
      expect(loadPullRequests).not.toHaveBeenCalled();
      expect(cache.get).not.toHaveBeenCalled();
    });
  });
});
