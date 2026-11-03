import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import { loadRebaseBranches } from './rebase-branches.service';

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({ readFile }));

/** `getCheckouts` reports a detached HEAD, which every rebase has, as the short sha git prints. */
const DETACHED = 'a1b2c3d';

/** Serves the listed files; any other path fails the way a missing file or a directory does. */
function mockFiles(files: Record<string, string>): void {
  readFile.mockImplementation(async (path: string) => {
    const content = files[path];
    if (content === undefined) {
      throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
    }

    return content;
  });
}

describe('rebase-branches.service', () => {
  beforeEach(() => {
    readFile.mockReset();
    mockFiles({});
  });

  describe('loadRebaseBranches', () => {
    it('should give a main clone mid-rebase the branch named in rebase-merge', async () => {
      mockFiles({ '/w/app/.git/rebase-merge/head-name': 'refs/heads/feat/layer-1\n' });

      expect(await loadRebaseBranches([{ path: '/w/app', branch: DETACHED }])).toEqual([
        { path: '/w/app', branch: 'feat/layer-1', isRebasing: true },
      ]);
    });

    it('should fall back to the branch named in rebase-apply', async () => {
      mockFiles({ '/w/app/.git/rebase-apply/head-name': 'refs/heads/feat/layer-2\n' });

      expect(await loadRebaseBranches([{ path: '/w/app', branch: DETACHED }])).toEqual([
        { path: '/w/app', branch: 'feat/layer-2', isRebasing: true },
      ]);
    });

    it("should read a linked worktree's rebase from the git dir its .git file points at", async () => {
      mockFiles({
        '/w/app@stack-7/.git': 'gitdir: /w/app/.git/worktrees/app@stack-7\n',
        '/w/app/.git/worktrees/app@stack-7/rebase-merge/head-name': 'refs/heads/feat/layer-3\n',
      });

      expect(await loadRebaseBranches([{ path: '/w/app@stack-7', branch: DETACHED }])).toEqual([
        { path: '/w/app@stack-7', branch: 'feat/layer-3', isRebasing: true },
      ]);
    });

    it('should keep a detached checkout that is not rebasing, and never read a checkout on a branch', async () => {
      const checkouts: Worktree[] = [
        { path: '/w/app', branch: 'master' },
        { path: '/w/app@probe', branch: DETACHED },
      ];

      const loaded = await loadRebaseBranches(checkouts);

      expect(loaded).toStrictEqual(checkouts);
      expect(readFile).not.toHaveBeenCalledWith(expect.stringMatching(/^\/w\/app\//), 'utf8');
    });

    it('should keep a checkout that is rebasing a detached HEAD as it is', async () => {
      mockFiles({ '/w/app/.git/rebase-merge/head-name': 'detached HEAD\n' });

      expect(await loadRebaseBranches([{ path: '/w/app', branch: DETACHED }])).toStrictEqual([
        { path: '/w/app', branch: DETACHED },
      ]);
    });
  });
});
