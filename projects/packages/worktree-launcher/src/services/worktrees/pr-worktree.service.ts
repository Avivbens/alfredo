import { getCheckouts } from '@alfredo/git-worktrees';
import { isPathTaken } from '../../common/path-exists.util';
import { pickFreePath, toLocalBranch, toWorktreeName, toWorktreePath } from '../../common/worktree-name.util';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import type { WorktreeResult } from '../../models/worktree-result.schema';
import { addBranchWorktree } from '../git-refs/branch.service';
import { toFetchRefspec } from '../git-refs/branch.util';
import { runGit } from '../system/git.service';

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
