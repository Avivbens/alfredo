import { matches } from 'fast-alfred';
import { type Cache, loadCached } from '@alfredo/cache';
import type { PrRef } from '../../common/pr-ref.util';
import { MIN_REFETCH_AGE_MS, PRS_CACHE_KEY, PRS_CACHE_TTL } from '../../config/constants';
import { cachedPullRequestsSchema } from '../../models/cached-prs.schema';
import type { PrIssue, PullRequest } from '../../models/pull-request.schema';
import { toSearchText } from './pr-match.util';
import { loadPullRequests, lookupPullRequest } from './pull-requests.service';

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

/** A PR assigned moments ago is missing from a cached list, so a miss on an old enough list asks for a fresh one. */
export function shouldRefetch(input: string, matched: number, age: number): boolean {
  return input.trim() !== '' && matched === 0 && age >= MIN_REFETCH_AGE_MS;
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
  const age = Date.now() - cached.fetchedAt;
  const stale = shouldRefetch(input, cachedMatches.length, age);
  if (!stale) {
    return { all: cached.prs, matched: cachedMatches, issues: cached.issues };
  }

  const fresh = await loadList(cache, true);
  const freshMatches = matches(input, fresh.prs, toSearchText);

  return { all: fresh.prs, matched: freshMatches, issues: fresh.issues };
}
