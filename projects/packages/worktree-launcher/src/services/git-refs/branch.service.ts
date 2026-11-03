import { GitError, runGit } from '../system/git.service';

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
