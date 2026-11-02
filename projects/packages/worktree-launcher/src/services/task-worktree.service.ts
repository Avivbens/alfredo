import { getCheckouts } from '@alfredo/git-worktrees';
import { isPathTaken } from '../common/path-exists.util';
import { pickFreePath, toWorktreeName, toWorktreePath } from '../common/worktree-name.util';
import type { Clone } from '../models/clone.schema';
import type { WorktreeResult } from '../models/worktree-result.schema';
import { runGit } from './git.service';
import { toFetchRefspec } from './pr-worktree.service';

/** `--no-track` keeps the new branch from pushing to, or being compared with, the trunk it started from. */
export async function ensureTaskWorktree(clone: Clone, branch: string, trunk: string): Promise<WorktreeResult> {
  const checkouts = await getCheckouts(clone.path);
  const existing = checkouts.find((checkout) => checkout.branch === branch);
  if (existing) {
    return { path: existing.path, created: false };
  }

  await runGit(clone.path, ['worktree', 'prune']);
  const name = toWorktreeName(branch);
  const preferred = toWorktreePath(clone.path, name);
  const path = await pickFreePath(preferred, isPathTaken);
  const remote = `refs/remotes/origin/${trunk}`;

  const refspec = toFetchRefspec(trunk);
  await runGit(clone.path, ['fetch', 'origin', refspec]);
  await runGit(clone.path, ['worktree', 'add', '--no-track', '-b', branch, path, remote]);

  return { path, created: true };
}
