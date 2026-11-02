import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import { pickStackFolder, readLocalStackBranches, toLocalStackBranches, toStackPath } from './stack-folder.service';

const STACK = ['feat/a', 'feat/b', 'feat/c'];
const CLONE_PATH = '/w/repo';
const STACK_PATH = '/w/repo@stack-7';

function toCheckout(path: string, branch: string): Worktree {
  return { path, branch };
}

describe('stack-folder.service', () => {
  describe('toStackPath', () => {
    it('should name the folder beside the clone after the stack number', () => {
      expect(toStackPath('/w/repo', 7)).toBe(STACK_PATH);
    });
  });

  describe('pickStackFolder', () => {
    it('should prefer the checkout on the target branch', () => {
      const checkouts = [
        toCheckout('/w/r', 'feat/a'),
        toCheckout(STACK_PATH, 'feat/b'),
        toCheckout('/w/r@c', 'feat/c'),
      ];

      expect(
        pickStackFolder(checkouts, STACK, { targetBranch: 'feat/c', stackPath: STACK_PATH, clonePath: CLONE_PATH }),
      ).toEqual(checkouts[2]);
    });

    it('should fall back to the checkout at the stack path', () => {
      const checkouts = [toCheckout('/w/r', 'feat/a'), toCheckout(STACK_PATH, 'feat/b')];

      expect(
        pickStackFolder(checkouts, STACK, { targetBranch: 'feat/c', stackPath: STACK_PATH, clonePath: CLONE_PATH }),
      ).toEqual(checkouts[1]);
    });

    it('should fall back to the shortest path', () => {
      const checkouts = [toCheckout('/w/repo@long-name', 'feat/a'), toCheckout('/w/r', 'feat/b')];

      expect(pickStackFolder(checkouts, STACK, { stackPath: STACK_PATH, clonePath: CLONE_PATH })).toEqual(checkouts[1]);
    });

    it('should rank the main checkout below every linked worktree, whatever their lengths', () => {
      const checkouts = [toCheckout(CLONE_PATH, 'feat/a'), toCheckout('/w/repo@worktree-flow', 'feat/c')];

      expect(
        pickStackFolder(checkouts, STACK, { targetBranch: 'feat/b', stackPath: STACK_PATH, clonePath: CLONE_PATH }),
      ).toEqual(checkouts[1]);
    });

    it('should pick the stack folder over a main checkout on a lower layer', () => {
      const checkouts = [toCheckout(CLONE_PATH, 'feat/a'), toCheckout(STACK_PATH, 'feat/c')];

      expect(
        pickStackFolder(checkouts, STACK, { targetBranch: 'feat/b', stackPath: STACK_PATH, clonePath: CLONE_PATH }),
      ).toEqual(checkouts[1]);
    });

    it('should still pick the main checkout when it is the only one in the stack', () => {
      const checkouts = [toCheckout(CLONE_PATH, 'feat/a'), toCheckout('/w/repo@other', 'fix/other')];

      expect(pickStackFolder(checkouts, STACK, { stackPath: STACK_PATH, clonePath: CLONE_PATH })).toEqual(checkouts[0]);
    });

    it('should never pick a checkout on an unrelated branch', () => {
      const checkouts = [toCheckout(STACK_PATH, 'feat/other'), toCheckout('/w/r', 'master')];

      expect(
        pickStackFolder(checkouts, STACK, { targetBranch: 'master', stackPath: STACK_PATH, clonePath: CLONE_PATH }),
      ).toBeUndefined();
    });

    it('should never pick a detached checkout, since its branch is a short sha', () => {
      const checkouts = [toCheckout(STACK_PATH, '1a950a9')];

      expect(pickStackFolder(checkouts, STACK, { stackPath: STACK_PATH, clonePath: CLONE_PATH })).toBeUndefined();
    });

    it('should not change the input order', () => {
      const checkouts = [toCheckout('/w/repo@long-name', 'feat/a'), toCheckout('/w/r', 'feat/b')];

      pickStackFolder(checkouts, STACK, { stackPath: STACK_PATH, clonePath: CLONE_PATH });

      expect(checkouts.map(({ path }) => path)).toEqual(['/w/repo@long-name', '/w/r']);
    });
  });

  describe('toLocalStackBranches', () => {
    it('should list every branch of each local stack that holds a known branch', () => {
      const stacks = [
        { number: 50, branches: [{ branch: 'feat/a', pullRequest: { number: 48 } }] },
        { branches: [{ branch: 'feat/x' }, { branch: 'feat/local-top' }] },
      ];

      expect(toLocalStackBranches(stacks, ['feat/x'])).toEqual(['feat/x', 'feat/local-top']);
    });
  });

  describe('readLocalStackBranches', () => {
    let repo: string;

    beforeEach(async () => {
      repo = await mkdtemp(join(tmpdir(), 'stack-folder-'));
      await mkdir(join(repo, '.git'));
    });

    afterEach(async () => {
      await rm(repo, { recursive: true, force: true });
    });

    it('should add the local-only top branch of a stack that holds a known branch', async () => {
      const file = {
        schemaVersion: 1,
        stacks: [
          { number: 50, branches: [{ branch: 'feat/a', pullRequest: { number: 48 } }] },
          { branches: [{ branch: 'feat/x' }, { branch: 'feat/local-top' }] },
          { branches: [{ branch: 'feat/unrelated' }] },
        ],
      };
      await writeFile(join(repo, '.git', 'gh-stack'), JSON.stringify(file));

      expect(await readLocalStackBranches(repo, ['feat/x'])).toEqual(['feat/x', 'feat/local-top']);
    });

    it('should return nothing when no local stack holds a given branch', async () => {
      await writeFile(
        join(repo, '.git', 'gh-stack'),
        JSON.stringify({ schemaVersion: 1, stacks: [{ branches: [{ branch: 'feat/x' }] }] }),
      );

      expect(await readLocalStackBranches(repo, ['feat/y'])).toEqual([]);
    });

    it('should return nothing when the file is missing', async () => {
      expect(await readLocalStackBranches(repo, ['feat/x'])).toEqual([]);
    });
  });
});
