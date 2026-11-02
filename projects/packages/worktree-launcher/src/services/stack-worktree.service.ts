import { secondsToMilliseconds } from 'date-fns';
import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import { toHomeRelative } from '../common/home-path.util';
import { isPathTaken } from '../common/path-exists.util';
import { pickFreePath } from '../common/worktree-name.util';
import type { Clone } from '../models/clone.schema';
import type { StackAction } from '../models/launch-action.schema';
import type { WorktreeResult } from '../models/worktree-result.schema';
import { runGit } from './git.service';
import { addBranchWorktree, fastForwardBranch, hasLocalBranch, toFetchRefspec } from './pr-worktree.service';
import { loadRebaseBranches } from './rebase-branches.service';
import { pickStackFolder, readLocalStackBranches, toStackPath } from './stack-folder.service';

const STATUS_TIMEOUT_MS = secondsToMilliseconds(2);

/**
 * A hung or failing status must neither stall the launch nor let a switch run, so only an empty answer is clean.
 * Untracked files are left out because `switch` already refuses to overwrite them.
 */
async function isFolderClean(path: string): Promise<boolean> {
  try {
    const output = await runGit(path, ['--no-optional-locks', 'status', '--porcelain', '--untracked-files=no'], {
      timeout: STATUS_TIMEOUT_MS,
    });

    return !output.trim();
  } catch {
    return false;
  }
}

/** Refs are shared by every checkout, so they are read and moved in the clone, and only `switch` needs the folder. */
async function switchFolderToLayer(clonePath: string, folderPath: string, branch: string): Promise<void> {
  const refspec = toFetchRefspec(branch);
  await runGit(clonePath, ['fetch', 'origin', refspec]);
  const hasBranch = await hasLocalBranch(clonePath, branch);
  if (!hasBranch) {
    await runGit(folderPath, ['switch', '--track', '-c', branch, `origin/${branch}`]);

    return;
  }

  await fastForwardBranch(clonePath, branch);
  await runGit(folderPath, ['switch', branch]);
}

function toStayedResult({ path, branch }: Worktree, home: string, reason: string): WorktreeResult & { notice: string } {
  const location = toHomeRelative(path, home);

  return { path, created: false, notice: `Stayed on ${branch}: ${location} ${reason}` };
}

/**
 * A layer's checkout wins the folder pick, so reaching the switch or the create means no checkout holds the target
 * branch and its ref can move. A rebase with `rebase.updateRefs` ends by moving only refs still on their old sha, so a
 * folder mid-rebase gets no git at all. The other layers are only fetched, so later switches are cheap.
 */
export async function ensureStackWorktree(
  clone: Clone,
  action: StackAction,
  home: string,
): Promise<WorktreeResult & { notice?: string }> {
  const layer = action.layers.find(({ number }) => number === action.target);
  if (!layer) {
    throw new Error(`Stack ${action.number} has no open layer to open`);
  }

  const branches = action.layers.map(({ headRefName }) => headRefName);
  const stackPath = toStackPath(clone.path, action.number);
  const [checkouts, localBranches] = await Promise.all([
    getCheckouts(clone.path),
    readLocalStackBranches(clone.path, branches),
  ]);
  const stackCheckouts = await loadRebaseBranches(checkouts);
  const folder = pickStackFolder(stackCheckouts, [...branches, ...localBranches], {
    stackPath,
    clonePath: clone.path,
    targetBranch: layer.headRefName,
  });

  if (folder) {
    if (folder.branch === layer.headRefName) {
      return { path: folder.path, created: false };
    }
    if (folder.isRebasing) {
      return toStayedResult(folder, home, 'is in the middle of a rebase');
    }
    const isClean = await isFolderClean(folder.path);
    if (!isClean) {
      return toStayedResult(folder, home, 'has uncommitted changes');
    }

    await switchFolderToLayer(clone.path, folder.path, layer.headRefName);

    return { path: folder.path, created: false };
  }

  await runGit(clone.path, ['worktree', 'prune']);
  const path = await pickFreePath(stackPath, isPathTaken);
  const refspecs = branches.map(toFetchRefspec);
  await runGit(clone.path, ['fetch', 'origin', ...refspecs]);
  await addBranchWorktree(clone.path, layer.headRefName, path);

  return { path, created: true };
}
