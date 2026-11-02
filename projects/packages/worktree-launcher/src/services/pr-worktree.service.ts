import { getCheckouts } from '@alfredo/git-worktrees';
import { isPathTaken } from '../common/path-exists.util';
import { pickFreePath, toLocalBranch, toWorktreeName, toWorktreePath } from '../common/worktree-name.util';
import type { Clone } from '../models/clone.schema';
import type { PullRequest } from '../models/pull-request.schema';
import type { WorktreeResult } from '../models/worktree-result.schema';
import { GitError, runGit } from './git.service';

/** `show-ref` and `merge-base --is-ancestor` exit 1 for a plain "no", which is an answer, not a failure. */
async function succeeds(cwd: string, args: string[]): Promise<boolean> {
  try {
    await runGit(cwd, args);

    return true;
  } catch (error) {
    if (error instanceof GitError && error.exitCode === 1) {
      return false;
    }

    throw error;
  }
}

/**
 * The `+` keeps `origin/<branch>` current even in a clone with a narrowed fetch refspec, so a fast-forward never reads
 * a stale ref.
 */
export function toFetchRefspec(branch: string): string {
  return `+refs/heads/${branch}:refs/remotes/origin/${branch}`;
}

export async function hasLocalBranch(clonePath: string, branch: string): Promise<boolean> {
  return succeeds(clonePath, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
}

/** The old value makes git refuse the move if the ref changed since it was read. */
export async function fastForwardBranch(clonePath: string, branch: string): Promise<void> {
  const local = `refs/heads/${branch}`;
  const remote = `refs/remotes/origin/${branch}`;
  const canFastForward = await succeeds(clonePath, ['merge-base', '--is-ancestor', local, remote]);
  if (!canFastForward) {
    return;
  }

  const output = await runGit(clonePath, ['rev-parse', local]);
  const oldSha = output.trim();
  await runGit(clonePath, ['update-ref', local, remote, oldSha]);
}

export async function addBranchWorktree(clonePath: string, branch: string, path: string): Promise<void> {
  const hasBranch = await hasLocalBranch(clonePath, branch);
  if (!hasBranch) {
    await runGit(clonePath, ['worktree', 'add', '--track', '-b', branch, path, `origin/${branch}`]);

    return;
  }

  await fastForwardBranch(clonePath, branch);
  await runGit(clonePath, ['worktree', 'add', path, branch]);
}

/** The early return means the branch is not checked out anywhere, so a fast-forward is safe. */
export async function ensurePrWorktree(clone: Clone, pr: PullRequest): Promise<WorktreeResult> {
  const branch = toLocalBranch(pr);
  const checkouts = await getCheckouts(clone.path);
  const existing = checkouts.find((checkout) => checkout.branch === branch);
  if (existing) {
    return { path: existing.path, created: false };
  }

  /** A hand-deleted worktree stays registered as prunable, so `worktree add` would refuse its path and its branch. */
  await runGit(clone.path, ['worktree', 'prune']);
  const name = toWorktreeName(branch);
  const preferred = toWorktreePath(clone.path, name);
  const path = await pickFreePath(preferred, isPathTaken);

  if (pr.isCrossRepository) {
    await runGit(clone.path, ['fetch', 'origin', `pull/${pr.number}/head:${branch}`]);
    await runGit(clone.path, ['worktree', 'add', path, branch]);

    return { path, created: true };
  }

  const refspec = toFetchRefspec(branch);
  await runGit(clone.path, ['fetch', 'origin', refspec]);
  await addBranchWorktree(clone.path, branch, path);

  return { path, created: true };
}
