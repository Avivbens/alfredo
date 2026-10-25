import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseGitdirPointer, parseHead, toRepoOfAdminDir } from '../common/git-metadata.util';
import type { Worktree } from '../models/worktree.model';

function inGitDir(checkoutPath: string, ...segments: string[]): string {
  return join(checkoutPath, '.git', ...segments);
}

/** Most search results are not git checkouts, so a missing or unreadable file is an answer, not an error. */
async function readGitFile(path: string): Promise<string | null> {
  const content = await readFile(path, 'utf8').catch(() => null);
  return content?.trim() ?? null;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function byPath(a: Worktree, b: Worktree): number {
  return a.path.localeCompare(b.path);
}

/** Skips worktrees deleted without `git worktree prune`. `resolve` also covers `worktree.useRelativePaths`. */
async function getLinkedWorktree(adminDir: string): Promise<Worktree | null> {
  const [gitdir, head] = await Promise.all([
    readGitFile(join(adminDir, 'gitdir')),
    readGitFile(join(adminDir, 'HEAD')),
  ]);
  if (gitdir === null || head === null) {
    return null;
  }

  const dotGit = resolve(adminDir, gitdir);
  if (!(await exists(dotGit))) {
    return null;
  }

  return { path: dirname(dotGit), branch: parseHead(head) };
}

/** Reads git's own metadata instead of spawning `git worktree list`, so checking every result stays sub-millisecond. */
async function getLinkedWorktrees(repoPath: string): Promise<Worktree[]> {
  const adminRoot = inGitDir(repoPath, 'worktrees');
  const names = await readdir(adminRoot).catch((): string[] => []);
  const worktrees = await Promise.all(names.map((name) => getLinkedWorktree(join(adminRoot, name))));

  return worktrees.filter((worktree): worktree is Worktree => !!worktree).sort(byPath);
}

export async function getCheckouts(repoPath: string): Promise<Worktree[]> {
  const [head, linked] = await Promise.all([readGitFile(inGitDir(repoPath, 'HEAD')), getLinkedWorktrees(repoPath)]);
  if (head === null) {
    return [];
  }

  return [{ path: repoPath, branch: parseHead(head) }, ...linked];
}

export async function getRepoOfWorktree(path: string): Promise<string | null> {
  const dotGitFile = await readGitFile(inGitDir(path));
  const gitdir = dotGitFile && parseGitdirPointer(dotGitFile);
  if (!gitdir) {
    return null;
  }

  return toRepoOfAdminDir(resolve(path, gitdir));
}
