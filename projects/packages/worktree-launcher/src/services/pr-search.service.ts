import { minutesToMilliseconds } from 'date-fns';
import type { FastAlfred } from 'fast-alfred';
import { matches } from 'fast-alfred';
import type { PrRef } from '../common/pr-ref.util';
import { cachedPullRequestsSchema } from '../models/cached-prs.schema';
import type { PrIssue, PullRequest } from '../models/pull-request.schema';
import { loadCached } from './cache.service';
import { toSearchText } from './pr-match.service';
import { loadPullRequests, lookupPullRequest } from './pull-requests.service';

const PRS_CACHE_KEY = 'prs';
const PRS_CACHE_TTL = minutesToMilliseconds(1);

type PrSearchResult = { prs: PullRequest[]; issues: PrIssue[] };

export async function loadMatchingPullRequests(
  cache: FastAlfred['cache'],
  input: string,
  ref: PrRef | null,
): Promise<PrSearchResult> {
  if (ref) {
    return lookupPullRequest(ref);
  }

  const { prs, issues } = await loadCached(
    cache,
    PRS_CACHE_KEY,
    PRS_CACHE_TTL,
    cachedPullRequestsSchema,
    loadPullRequests,
    (result) => !result.issues.length,
  );

  const matched = matches(input, prs, toSearchText);

  return { prs: matched, issues };
}
