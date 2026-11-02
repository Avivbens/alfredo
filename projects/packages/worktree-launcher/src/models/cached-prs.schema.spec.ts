import { describe, expect, it } from 'vitest';
import { cachedPullRequestsSchema } from './cached-prs.schema';

describe('cached-prs.schema', () => {
  it('should still parse a cached list from before stacks and assigned', () => {
    const cached = {
      prs: [
        {
          number: 3,
          title: 'Add worktree launcher',
          url: 'https://github.com/Avivbens/alfredo/pull/3',
          isDraft: false,
          headRefName: 'feat/launcher',
          isCrossRepository: false,
          nameWithOwner: 'avivbens/alfredo',
          source: 'review',
        },
      ],
      issues: [],
      fetchedAt: 1_000,
    };

    const parsed = cachedPullRequestsSchema.safeParse(cached);

    expect(parsed.success).toBe(true);
    expect(parsed.data?.prs[0]?.stack).toBeUndefined();
  });

  it('should reject an entry without fetchedAt so it is refetched', () => {
    expect(cachedPullRequestsSchema.safeParse({ prs: [], issues: [] }).success).toBe(false);
  });
});
