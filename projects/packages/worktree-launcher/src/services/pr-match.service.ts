import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import { toLocalBranch } from '../common/worktree-name.util';
import type { Clone } from '../models/clone.schema';
import type { PullRequest } from '../models/pull-request.schema';

export type PrState = { pr: PullRequest; clone?: Clone; worktree?: Worktree };

/** A PR can be both authored by you and awaiting your review; the authored entry wins so it never shows twice. */
function toUniquePullRequests(prs: PullRequest[]): PullRequest[] {
  const mineFirst = [...prs].sort((a, b) => Number(b.source === 'mine') - Number(a.source === 'mine'));
  const kept = mineFirst.filter((pr, index) => mineFirst.findIndex(({ url }) => url === pr.url) === index);

  return prs.filter((pr) => kept.includes(pr));
}

function toPrState(pr: PullRequest, clones: Clone[], checkouts: Record<string, Worktree[]>): PrState {
  const branch = toLocalBranch(pr);
  const states = clones
    .filter(({ nameWithOwner }) => nameWithOwner === pr.nameWithOwner)
    .sort((a, b) => a.path.length - b.path.length)
    .map((clone) => ({ pr, clone, worktree: checkouts[clone.path]?.find((checkout) => checkout.branch === branch) }));

  return states.find(({ worktree }) => worktree) ?? states[0] ?? { pr };
}

/** With several clones of one repo, the one that already has the branch wins, then the shortest path. */
export function toPrStates(prs: PullRequest[], clones: Clone[], checkouts: Record<string, Worktree[]>): PrState[] {
  const unique = toUniquePullRequests(prs);

  return unique.map((pr) => toPrState(pr, clones, checkouts));
}

/** Only clones of a listed repo are read, since each `getCheckouts` call touches the disk. */
export async function loadPrStates(prs: PullRequest[], clones: Clone[]): Promise<PrState[]> {
  const names = prs.map(({ nameWithOwner }) => nameWithOwner);
  const repos = new Set(names);
  const relevant = clones.filter(({ nameWithOwner }) => repos.has(nameWithOwner));
  const entries = await Promise.all(
    relevant.map(async ({ path }) => {
      const checkouts = await getCheckouts(path);

      return [path, checkouts] as const;
    }),
  );

  const checkouts = Object.fromEntries(entries);

  return toPrStates(prs, clones, checkouts);
}

export function toSearchText({ title, nameWithOwner, number }: PullRequest): string {
  return `${title} ${nameWithOwner} #${number}`;
}
