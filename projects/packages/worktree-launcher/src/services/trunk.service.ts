import type { Clone } from '../models/clone.schema';
import { runGh } from './gh.service';
import { GitError, runGit, toCommandError } from './git.service';
import { resolveTool } from './tools.service';

const ORIGIN_HEAD = 'refs/remotes/origin/HEAD';
const ORIGIN_PREFIX = 'refs/remotes/origin/';

/** The repo is named so a fork clone gets its own default branch, not its upstream's. */
async function readDefaultBranch(gh: string, nameWithOwner: string): Promise<string> {
  const args = ['repo', 'view', nameWithOwner, '--json', 'defaultBranchRef', '-q', '.defaultBranchRef.name'];
  try {
    const output = await runGh(gh, args);

    return output.trim();
  } catch (error) {
    throw toCommandError(error);
  }
}

/**
 * Any git failure falls back to gh, since an unset `origin/HEAD` is common in a clone made without `git clone`.
 * The full ref is read because `--short` prints `remotes/origin/main` when a local branch is named `origin/main`.
 */
export async function getTrunk(clone: Clone): Promise<string> {
  try {
    const output = await runGit(clone.path, ['symbolic-ref', ORIGIN_HEAD]);
    const head = output.trim();
    const name = head.startsWith(ORIGIN_PREFIX) ? head.slice(ORIGIN_PREFIX.length) : '';
    if (name) {
      return name;
    }
  } catch (error) {
    if (!(error instanceof GitError)) {
      throw error;
    }
  }

  const gh = await resolveTool('gh');
  if (!gh) {
    throw new Error('Could not tell the default branch: origin/HEAD is not set and gh was not found');
  }

  const name = await readDefaultBranch(gh, clone.nameWithOwner);
  if (!name) {
    throw new Error('Could not tell the default branch of this repo');
  }

  return name;
}
