import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Worktree } from '@alfredo/git-worktrees';

const SHORT_SHA = /^[0-9a-f]{7}$/;
const GITDIR_POINTER = /^gitdir: (.+)$/m;
const BRANCH_REFS = 'refs/heads/';
const REBASE_DIRS = ['rebase-merge', 'rebase-apply'];

export type StackCheckout = Worktree & { isRebasing?: true };

async function readTrimmed(path: string): Promise<string | null> {
  try {
    const content = await readFile(path, 'utf8');

    return content.trim();
  } catch {
    return null;
  }
}

/** A linked worktree's `.git` is a file pointing at its own git dir, and `resolve` also covers a relative pointer. */
async function readGitDir(checkoutPath: string): Promise<string> {
  const dotGit = join(checkoutPath, '.git');
  const pointer = await readTrimmed(dotGit);
  const gitdir = pointer?.match(GITDIR_POINTER)?.[1];

  return gitdir ? resolve(checkoutPath, gitdir) : dotGit;
}

async function readRebaseBranch(gitDir: string): Promise<string | null> {
  for (const dir of REBASE_DIRS) {
    const headName = await readTrimmed(join(gitDir, dir, 'head-name'));
    if (headName?.startsWith(BRANCH_REFS)) {
      return headName.slice(BRANCH_REFS.length);
    }
  }

  return null;
}

/**
 * A rebase detaches HEAD, so a stack folder mid-rebase would look free and a second one would be created beside it.
 * Only the stack folder pick uses this, since the checkout is not really on that branch until the rebase ends.
 */
export async function loadRebaseBranches(checkouts: Worktree[]): Promise<StackCheckout[]> {
  return Promise.all(
    checkouts.map(async (checkout) => {
      if (!SHORT_SHA.test(checkout.branch)) {
        return checkout;
      }
      const gitDir = await readGitDir(checkout.path);
      const branch = await readRebaseBranch(gitDir);

      return branch ? { ...checkout, branch, isRebasing: true } : checkout;
    }),
  );
}
