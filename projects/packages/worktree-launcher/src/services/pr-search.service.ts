import { minutesToMilliseconds } from 'date-fns';
import { matches } from 'fast-alfred';
import type { PrRef } from '../common/pr-ref.util';
import { cachedPullRequestsSchema } from '../models/cached-prs.schema';
import type { PrIssue, PullRequest } from '../models/pull-request.schema';
import type { Cache } from './cache.service';
import { loadCached } from './cache.service';
import { shouldRefetch, toSearchText } from './pr-match.service';
import { loadPullRequests, lookupPullRequest } from './pull-requests.service';

const PRS_CACHE_KEY = 'prs';
const PRS_CACHE_TTL = minutesToMilliseconds(1);

type PrSearchResult = { all: PullRequest[]; matched: PullRequest[]; issues: PrIssue[] };

async function loadAllPullRequests() {
  const result = await loadPullRequests();

  return { ...result, fetchedAt: Date.now() };
}

function loadList(cache: Cache, force: boolean) {
  return loadCached(
    cache,
    PRS_CACHE_KEY,
    PRS_CACHE_TTL,
    cachedPullRequestsSchema,
    loadAllPullRequests,
    ({ issues }) => !issues.length,
    { force },
  );
}

/** `all` stays unfiltered because stack layers are resolved from the whole list, and a refetch replaces both. */
export async function loadPullRequestList({
  cache,
  input,
  ref,
}: {
  cache: Cache;
  input: string;
  ref: PrRef | null;
}): Promise<PrSearchResult> {
  if (ref) {
    const { prs, issues } = await lookupPullRequest(ref);

    return { all: prs, matched: prs, issues };
  }

  const cached = await loadList(cache, false);
  const cachedMatches = matches(input, cached.prs, toSearchText);
  const stale = shouldRefetch({ input, matched: cachedMatches.length, fetchedAt: cached.fetchedAt, now: Date.now() });
  if (!stale) {
    return { all: cached.prs, matched: cachedMatches, issues: cached.issues };
  }

  const fresh = await loadList(cache, true);
  const freshMatches = matches(input, fresh.prs, toSearchText);

  return { all: fresh.prs, matched: freshMatches, issues: fresh.issues };
}
