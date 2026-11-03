import type { Worktree } from '@alfredo/git-worktrees';
import { toLocalBranch } from '../../common/worktree-name.util';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';

export type PrState = { pr: PullRequest; clone?: Clone; worktree?: Worktree };

const SOURCE_RANK: Record<PullRequest['source'], number> = { mine: 0, review: 1, assigned: 2, lookup: 3, stack: 4 };

/** A PR can come from several searches at once; the lowest-ranked source wins so it never shows twice. */
function toUniquePullRequests(prs: PullRequest[]): PullRequest[] {
  const ranked = [...prs].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);
  const kept = ranked.filter((pr, index) => ranked.findIndex(({ url }) => url === pr.url) === index);

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

export function toSearchText({ title, nameWithOwner, number, headRefName, stack }: PullRequest): string {
  const text = `${title} ${nameWithOwner} #${number} ${headRefName}`;

  return stack ? `${text} stack ${stack.number}` : text;
}
