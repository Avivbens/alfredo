import { IconService } from 'fast-alfred';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalStack, Worktree } from '@alfredo/git-worktrees';
import { getCheckouts, readLocalStacks } from '@alfredo/git-worktrees';
import type { WorktreesRoute } from '../models/routes.model';
import { loadCheckoutOutput } from './checkout-output.service';
import { isDirty } from './dirty.service';
import { toCheckoutItem } from './file-item.service';

vi.mock('@alfredo/git-worktrees', () => ({ getCheckouts: vi.fn(), readLocalStacks: vi.fn() }));
vi.mock('./dirty.service', () => ({ isDirty: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const ALFREDO = '/Users/me/dev/alfredo';
const icons = new IconService();

const CHECKOUTS: Worktree[] = [
  { path: REPO, branch: 'master' },
  { path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' },
  { path: `${REPO}@m5-shortcut-api`, branch: 'feat/builder-ts-source' },
];

/** Trimmed from the alfredo repo's `git worktree list` and `.git/gh-stack`. */
const ALFREDO_CHECKOUTS: Worktree[] = [
  { path: ALFREDO, branch: 'migration/bump-fast-alfred' },
  { path: `${ALFREDO}@chrome-tabs-markdown`, branch: 'feat/chrome-tabs-markdown' },
  { path: `${ALFREDO}@search-gif`, branch: 'feat/search-gif-preview' },
  { path: `${ALFREDO}@search-gif-copy`, branch: 'feat/search-gif-copy' },
  { path: `${ALFREDO}@search-gif-search`, branch: 'feat/search-gif-search' },
  { path: `${ALFREDO}@worktree-flow`, branch: 'feat/advance-fs-search-stacks' },
];
const ALFREDO_STACKS: LocalStack[] = [
  {
    branches: [
      { branch: 'feat/worktree-launcher-new-task' },
      { branch: 'feat/worktree-launcher-stacks' },
      { branch: 'feat/advance-fs-search-stacks' },
    ],
  },
  {
    number: 68,
    branches: [
      { branch: 'fix/generate-workflow-builds', prNumber: 67 },
      { branch: 'feat/search-gif-scaffold', prNumber: 58 },
      { branch: 'feat/search-gif-search', prNumber: 59 },
      { branch: 'feat/search-gif-copy', prNumber: 60 },
      { branch: 'feat/search-gif-preview', prNumber: 62 },
    ],
  },
];

function toRoute(filter: string, repoPath = REPO): WorktreesRoute {
  return { name: 'worktrees', state: { repoPath }, filter };
}

function mockAlfredo(): void {
  vi.mocked(getCheckouts).mockResolvedValue(ALFREDO_CHECKOUTS);
  vi.mocked(readLocalStacks).mockResolvedValue(ALFREDO_STACKS);
}

describe('checkout-output.service', () => {
  beforeEach(() => {
    vi.mocked(readLocalStacks).mockResolvedValue([]);
    vi.mocked(isDirty).mockResolvedValue(false);
    vi.mocked(getCheckouts).mockResolvedValue(CHECKOUTS);
  });

  describe('loadCheckoutOutput', () => {
    it('should list every checkout of the drilled repo before anything is typed', async () => {
      const { items } = await loadCheckoutOutput(toRoute(''), icons);

      expect(items).toHaveLength(3);
      expect(getCheckouts).toHaveBeenCalledWith(REPO);
      expect(readLocalStacks).toHaveBeenCalledWith(REPO);
    });

    it.each([
      ['builder', 'ios-shortcuts@m5-shortcut-api'],
      ['M4', 'ios-shortcuts@m4-libraries'],
    ])('should match %s against the branch or the folder name, in any case', async (filter, title) => {
      const { items } = await loadCheckoutOutput(toRoute(filter), icons);

      expect(items.map((item) => item.title)).toEqual([title]);
    });

    it('should mark only dirty checkouts with ●', async () => {
      vi.mocked(isDirty).mockImplementation(async (path) => path.endsWith('@m4-libraries'));

      const { items } = await loadCheckoutOutput(toRoute(''), icons);

      expect(items.map((item) => item.title)).toEqual([
        'ios-shortcuts',
        'ios-shortcuts@m4-libraries ●',
        'ios-shortcuts@m5-shortcut-api',
      ]);
    });

    it("should list today's checkouts exactly when the repo has no local stacks", async () => {
      const { items } = await loadCheckoutOutput(toRoute(''), icons);

      expect(items).toEqual(CHECKOUTS.map((checkout) => toCheckoutItem(checkout, icons)));
    });

    it("should show a stack's worktrees together in layer order, under a header", async () => {
      mockAlfredo();

      const { items } = await loadCheckoutOutput(toRoute('', ALFREDO), icons);

      expect(items.map(({ title, subtitle }) => [title, subtitle])).toEqual([
        ['alfredo', `migration/bump-fast-alfred · ${ALFREDO}`],
        ['alfredo@chrome-tabs-markdown', `feat/chrome-tabs-markdown · ${ALFREDO}@chrome-tabs-markdown`],
        ['┌ Stack 68 · 3 worktrees', '3 of 5 layers checked out'],
        ['│ alfredo@search-gif-search', `3/5 #59 · feat/search-gif-search · ${ALFREDO}@search-gif-search`],
        ['│ alfredo@search-gif-copy', `4/5 #60 · feat/search-gif-copy · ${ALFREDO}@search-gif-copy`],
        ['└ alfredo@search-gif', `5/5 #62 · feat/search-gif-preview · ${ALFREDO}@search-gif`],
        ['┌ Stack · worktree-flow', '1 of 3 layers checked out'],
        ['└ alfredo@worktree-flow', `3/3 · feat/advance-fs-search-stacks · ${ALFREDO}@worktree-flow`],
      ]);
    });

    it('should keep only stack 68 and its header for "stack 68"', async () => {
      mockAlfredo();

      const { items } = await loadCheckoutOutput(toRoute('stack 68', ALFREDO), icons);

      expect(items.map(({ title }) => title)).toEqual([
        '┌ Stack 68 · 3 worktrees',
        '│ alfredo@search-gif-search',
        '│ alfredo@search-gif-copy',
        '└ alfredo@search-gif',
      ]);
    });

    it('should close the tree on the last worktree typing leaves, keeping ● after a dirty folder name', async () => {
      mockAlfredo();
      vi.mocked(isDirty).mockImplementation(async (path) => path.endsWith('@search-gif-copy'));

      const { items } = await loadCheckoutOutput(toRoute('copy', ALFREDO), icons);

      expect(items.map(({ title }) => title)).toEqual(['┌ Stack 68 · 3 worktrees', '└ alfredo@search-gif-copy ●']);
    });

    it("should keep the list's order, so Alfred's usage knowledge never splits a stack apart", async () => {
      mockAlfredo();

      const output = await loadCheckoutOutput(toRoute('', ALFREDO), icons);

      expect(output.skipknowledge).toBe(true);
    });
  });
});
