import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findClones } from './clone-index.service';

let root: string;

const CORE_CONFIG = '[core]\n\tbare = false\n';

function toGitConfig(origin?: string): string {
  if (!origin) {
    return CORE_CONFIG;
  }

  return `${CORE_CONFIG}[remote "origin"]\n\turl = ${origin}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`;
}

async function createClone(path: string, origin?: string): Promise<string> {
  const repo = join(root, path);
  await mkdir(join(repo, '.git'), { recursive: true });
  await writeFile(join(repo, '.git', 'config'), toGitConfig(origin));

  return repo;
}

describe('clone-index.service', () => {
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'clone-index-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('findClones', () => {
    it('should find main clones down to the depth', async () => {
      const a = await createClone('a', 'git@github.com:Owner/A.git');
      const b = await createClone('group/b', 'https://github.com/owner/b');
      await createClone('group/deep/c', 'https://github.com/owner/c');

      expect(await findClones([root], 2)).toEqual([
        { path: a, nameWithOwner: 'owner/a' },
        { path: b, nameWithOwner: 'owner/b' },
      ]);
    });

    it('should skip linked worktrees, which have a .git file', async () => {
      const a = await createClone('a', 'https://github.com/owner/a');
      await mkdir(join(root, 'a@feature'), { recursive: true });
      await writeFile(join(root, 'a@feature', '.git'), `gitdir: ${join(a, '.git', 'worktrees', 'feature')}\n`);

      expect(await findClones([root], 1)).toEqual([{ path: a, nameWithOwner: 'owner/a' }]);
    });

    it('should skip clones without an origin', async () => {
      await createClone('local');

      expect(await findClones([root], 1)).toEqual([]);
    });

    it('should not look inside a clone, node_modules or dot-folders', async () => {
      const a = await createClone('a', 'https://github.com/owner/a');
      await createClone('a/vendor/inner', 'https://github.com/owner/inner');
      await createClone('node_modules/pkg', 'https://github.com/owner/pkg');
      await createClone('.hidden/h', 'https://github.com/owner/h');

      expect(await findClones([root], 3)).toEqual([{ path: a, nameWithOwner: 'owner/a' }]);
    });

    it('should list each clone once when roots overlap or repeat', async () => {
      const b = await createClone('group/b', 'https://github.com/owner/b');

      expect(await findClones([root, join(root, 'group'), `${join(root, 'group')}/`, root], 2)).toEqual([
        { path: b, nameWithOwner: 'owner/b' },
      ]);
    });

    it('should skip roots that cannot be read', async () => {
      expect(await findClones([join(root, 'missing')], 2)).toEqual([]);
    });
  });
});
