import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import { readEachClone } from '../repos/clones.service';
import type { PrState } from './pr-match.util';
import { toPrStates } from './pr-match.util';

/** Only clones of a listed repo are read, since each `getCheckouts` call touches the disk. */
export function loadCheckouts(prs: PullRequest[], clones: Clone[]): Promise<Record<string, Worktree[]>> {
  const names = prs.map(({ nameWithOwner }) => nameWithOwner);
  const repos = new Set(names);
  const relevant = clones.filter(({ nameWithOwner }) => repos.has(nameWithOwner));

  return readEachClone(relevant, getCheckouts);
}

export async function loadPrStates(prs: PullRequest[], clones: Clone[]): Promise<PrState[]> {
  const checkouts = await loadCheckouts(prs, clones);

  return toPrStates(prs, clones, checkouts);
}
