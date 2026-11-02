import { secondsToMilliseconds } from 'date-fns';
import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import { toLocalBranch } from '../common/worktree-name.util';
import type { Clone } from '../models/clone.schema';
import type { PullRequest } from '../models/pull-request.schema';

export type PrState = { pr: PullRequest; clone?: Clone; worktree?: Worktree };

const SOURCE_RANK: Record<PullRequest['source'], number> = { mine: 0, review: 1, assigned: 2, lookup: 3, stack: 4 };

/** A PR can come from several searches at once; the lowest-ranked source wins so it never shows twice. */
function toUniquePullRequests(prs: PullRequest[]): PullRequest[] {
  const ranked = [...prs].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);
  const kept = ranked.filter((pr, index) => ranked.findIndex(({ url }) => url === pr.url) === index);

  return prs.filter((pr) => kept.includes(pr));
}

function findWorktree(pr: PullRequest, checkouts: Worktree[] = []): Worktree | undefined {
  const branch = toLocalBranch(pr);

  return checkouts.find((checkout) => checkout.branch === branch);
}

function toPrState(pr: PullRequest, clones: Clone[], checkouts: Record<string, Worktree[]>): PrState {
  const candidates = clones
    .filter(({ nameWithOwner }) => nameWithOwner === pr.nameWithOwner)
    .sort((a, b) => a.path.length - b.path.length);
  const withBranch = candidates.find((clone) => findWorktree(pr, checkouts[clone.path]));
  const clone = withBranch ?? candidates[0];
  if (!clone) {
    return { pr };
  }
  const worktree = findWorktree(pr, checkouts[clone.path]);

  return worktree ? { pr, clone, worktree } : { pr, clone };
}

/** With several clones of one repo, the one that already has the branch wins, then the shortest path. */
export function toPrStates(prs: PullRequest[], clones: Clone[], checkouts: Record<string, Worktree[]>): PrState[] {
  const unique = toUniquePullRequests(prs);

  return unique.map((pr) => toPrState(pr, clones, checkouts));
}

/** Only clones of a listed repo are read, since each `getCheckouts` call touches the disk. */
export async function loadCheckouts(prs: PullRequest[], clones: Clone[]): Promise<Record<string, Worktree[]>> {
  const names = prs.map(({ nameWithOwner }) => nameWithOwner);
  const repos = new Set(names);
  const relevant = clones.filter(({ nameWithOwner }) => repos.has(nameWithOwner));
  const entries = await Promise.all(
    relevant.map(async ({ path }) => {
      const checkouts = await getCheckouts(path);

      return [path, checkouts] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function loadPrStates(prs: PullRequest[], clones: Clone[]): Promise<PrState[]> {
  const checkouts = await loadCheckouts(prs, clones);

  return toPrStates(prs, clones, checkouts);
}

export function toSearchText({ title, nameWithOwner, number, headRefName, stack }: PullRequest): string {
  const text = `${title} ${nameWithOwner} #${number} ${headRefName}`;

  return stack ? `${text} stack ${stack.number}` : text;
}

/** Below this age a miss is trusted, so typing never hammers `gh`. */
export const MIN_REFETCH_AGE_MS = secondsToMilliseconds(10);

/** A PR assigned moments ago is missing from a cached list, so a miss on an old enough list asks for a fresh one. */
export function shouldRefetch({
  input,
  matched,
  fetchedAt,
  now,
}: {
  input: string;
  matched: number;
  fetchedAt: number;
  now: number;
}): boolean {
  if (!input.trim() || matched > 0) {
    return false;
  }

  return now - fetchedAt >= MIN_REFETCH_AGE_MS;
}
