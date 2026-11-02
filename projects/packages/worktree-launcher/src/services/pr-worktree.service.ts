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
 * The early return means the branch is not checked out anywhere, so moving a behind local ref is safe;
 * a leftover folder from a worktree deleted without pruning still counts as taken. The `+` refspec keeps
 * `origin/<branch>` current even in a clone with a narrowed fetch refspec, so the fast-forward never reads a stale ref.
 */
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

  const local = `refs/heads/${branch}`;
  const remote = `refs/remotes/origin/${branch}`;
  await runGit(clone.path, ['fetch', 'origin', `+${local}:${remote}`]);
  const hasLocalBranch = await succeeds(clone.path, ['show-ref', '--verify', '--quiet', local]);
  if (!hasLocalBranch) {
    await runGit(clone.path, ['worktree', 'add', '--track', '-b', branch, path, `origin/${branch}`]);

    return { path, created: true };
  }

  const canFastForward = await succeeds(clone.path, ['merge-base', '--is-ancestor', local, remote]);
  if (canFastForward) {
    const output = await runGit(clone.path, ['rev-parse', local]);
    const oldSha = output.trim();
    await runGit(clone.path, ['update-ref', local, remote, oldSha]);
  }
  await runGit(clone.path, ['worktree', 'add', path, branch]);

  return { path, created: true };
}
