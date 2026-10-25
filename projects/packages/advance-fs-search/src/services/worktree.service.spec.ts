import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCheckouts, getRepoOfWorktree } from './worktree.service';

let root: string;

async function createRepo(name: string): Promise<string> {
  const repo = join(root, name);
  await mkdir(join(repo, '.git'), { recursive: true });
  await writeFile(join(repo, '.git', 'HEAD'), 'ref: refs/heads/master\n');

  return repo;
}

/** Mirrors what `git worktree add ../<repo>@<name>` writes: the checkout's `.git` file and the repo's admin dir. */
async function addWorktree(repo: string, name: string, options = { relativeGitdir: false }): Promise<string> {
  const path = `${repo}@${name}`;
  const adminDir = join(repo, '.git', 'worktrees', name);
  const dotGit = join(path, '.git');
  await mkdir(adminDir, { recursive: true });
  await mkdir(path, { recursive: true });
  await writeFile(dotGit, `gitdir: ${adminDir}\n`);
  await writeFile(join(adminDir, 'gitdir'), `${options.relativeGitdir ? relative(adminDir, dotGit) : dotGit}\n`);
  await writeFile(join(adminDir, 'HEAD'), `ref: refs/heads/${name}\n`);

  return path;
}

describe('worktree.service', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'worktree-service-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('getCheckouts', () => {
    it('should list the main checkout first, then each worktree by path with its branch', async () => {
      const repo = await createRepo('ios-shortcuts');
      const m5 = await addWorktree(repo, 'm5-shortcut-api');
      const m4 = await addWorktree(repo, 'm4-libraries');

      expect(await getCheckouts(repo)).toEqual([
        { path: repo, branch: 'master' },
        { path: m4, branch: 'm4-libraries' },
        { path: m5, branch: 'm5-shortcut-api' },
      ]);
    });

    it('should resolve a gitdir written relative to the admin dir, as with worktree.useRelativePaths', async () => {
      const repo = await createRepo('repo');
      const path = await addWorktree(repo, 'feature', { relativeGitdir: true });

      expect(await getCheckouts(repo)).toEqual([
        { path: repo, branch: 'master' },
        { path, branch: 'feature' },
      ]);
    });

    it('should skip a worktree whose checkout was deleted without pruning', async () => {
      const repo = await createRepo('repo');
      const kept = await addWorktree(repo, 'kept');
      await rm(await addWorktree(repo, 'gone'), { recursive: true });

      expect(await getCheckouts(repo)).toEqual([
        { path: repo, branch: 'master' },
        { path: kept, branch: 'kept' },
      ]);
    });

    it('should skip a worktree git is still writing, whose admin dir has no HEAD yet', async () => {
      const repo = await createRepo('repo');
      await addWorktree(repo, 'adding');
      await rm(join(repo, '.git', 'worktrees', 'adding', 'HEAD'));

      expect(await getCheckouts(repo)).toEqual([{ path: repo, branch: 'master' }]);
    });

    it('should return nothing when the path is not a git repo', async () => {
      await mkdir(join(root, 'plain'));

      expect(await getCheckouts(join(root, 'plain'))).toEqual([]);
    });
  });

  describe('getRepoOfWorktree', () => {
    it('should point a linked worktree at its repo', async () => {
      const repo = await createRepo('repo');

      expect(await getRepoOfWorktree(await addWorktree(repo, 'feature'))).toBe(repo);
    });

    it('should find no repo above a repo itself, whose .git is a directory', async () => {
      expect(await getRepoOfWorktree(await createRepo('repo'))).toBeNull();
    });
  });
});
