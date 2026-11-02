import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckout, getCheckouts } from '@alfredo/git-worktrees';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import { isDirty } from './dirty.service';
import { loadResults } from './result-loader.service';
import { foldWorktrees } from './worktree-fold.service';

vi.mock('./worktree-fold.service', () => ({ foldWorktrees: vi.fn() }));
vi.mock('./dirty.service', () => ({ isDirty: vi.fn() }));
vi.mock('@alfredo/git-worktrees', () => ({ getCheckout: vi.fn(), getCheckouts: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const PLAIN_REPO = '/Users/me/dev/alfredo';
const LONE_WORKTREE = '/Users/me/dev/fast-alfred@fix-modifiers';
const NOTES = '/Users/me/notes.md';

const repo: FileSearch = { path: REPO, type: 'folder' };
const plainRepo: FileSearch = { path: PLAIN_REPO, type: 'folder' };
const loneWorktree: FileSearch = { path: LONE_WORKTREE, type: 'folder' };
const notes: FileSearch = { path: NOTES, type: 'file' };

/** A repo lists itself and its linked worktrees. A linked worktree lists nothing, since its `.git` is a file. */
const CHECKOUTS: Record<string, Worktree[]> = {
  [REPO]: [
    { path: REPO, branch: 'master' },
    { path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' },
  ],
  [PLAIN_REPO]: [{ path: PLAIN_REPO, branch: 'master' }],
};
const LONE_CHECKOUT: Worktree = { path: LONE_WORKTREE, branch: 'fix/modifiers' };

function toRowPath(row: ResultRow): string {
  switch (row.kind) {
    case 'entry':
      return row.file.path;

    case 'checkout':
      return row.checkout.path;

    case 'repo':
      return row.main.path;
  }
}

describe('result-loader.service', () => {
  beforeEach(() => {
    vi.mocked(isDirty).mockResolvedValue(false);
    vi.mocked(foldWorktrees).mockImplementation(async (results) => results);
    vi.mocked(getCheckouts).mockImplementation(async (path) => CHECKOUTS[path] ?? []);
    vi.mocked(getCheckout).mockImplementation(async (path) =>
      path === LONE_WORKTREE ? LONE_CHECKOUT : (CHECKOUTS[path]?.[0] ?? null),
    );
  });

  describe('loadResults', () => {
    it('should show a repo with linked worktrees as a repo row, and a repo without any as a checkout row', async () => {
      expect(await loadResults([repo, plainRepo, notes], 10, true)).toEqual([
        { kind: 'repo', main: { path: REPO, branch: 'master' }, worktreeCount: 1, dirty: false },
        { kind: 'checkout', checkout: { path: PLAIN_REPO, branch: 'master' }, dirty: false },
        { kind: 'entry', file: notes },
      ]);
      expect(getCheckouts).not.toHaveBeenCalledWith(NOTES);
      expect(getCheckout).not.toHaveBeenCalledWith(NOTES);
    });

    it('should show a worktree whose repo is not in the results as a checkout row, with its branch and ●', async () => {
      expect(await loadResults([loneWorktree], 10, true)).toEqual([
        { kind: 'checkout', checkout: LONE_CHECKOUT, dirty: false },
      ]);
    });

    it('should fold before cutting to the limit, so folded worktrees never leave the list short', async () => {
      const worktree: FileSearch = { path: `${REPO}@m4-libraries`, type: 'folder' };
      vi.mocked(foldWorktrees).mockImplementation(async (results) => results.filter((result) => result !== worktree));

      const rows = await loadResults([repo, worktree, plainRepo], 2, true);

      expect(rows.map(toRowPath)).toEqual([REPO, PLAIN_REPO]);
    });

    it('should never fold or list worktrees while the option is off, and never read git for files', async () => {
      expect(await loadResults([repo, notes, loneWorktree, plainRepo], 3, false)).toEqual([
        { kind: 'checkout', checkout: { path: REPO, branch: 'master' }, dirty: false },
        { kind: 'entry', file: notes },
        { kind: 'checkout', checkout: LONE_CHECKOUT, dirty: false },
      ]);
      expect(foldWorktrees).not.toHaveBeenCalled();
      expect(getCheckouts).not.toHaveBeenCalled();
      expect(getCheckout).not.toHaveBeenCalledWith(NOTES);
      expect(getCheckout).not.toHaveBeenCalledWith(PLAIN_REPO);
    });

    it.each([
      ['on', true],
      ['off', false],
    ])(
      'should mark the dirty git rows with worktrees %s, checking each under a 300 ms cap and never a file',
      async (_, searchWorktrees) => {
        vi.mocked(isDirty).mockImplementation(async (path) => path === REPO);

        const rows = await loadResults([repo, loneWorktree, notes], 10, searchWorktrees);

        expect(rows.map((row) => ('dirty' in row ? row.dirty : undefined))).toEqual([true, false, undefined]);
        expect(isDirty).toHaveBeenCalledTimes(2);
        expect(isDirty).toHaveBeenCalledWith(REPO, 300);
        expect(isDirty).toHaveBeenCalledWith(LONE_WORKTREE, 300);
      },
    );

    it('should check the git rows side by side, so the search waits for one cap at most', async () => {
      vi.mocked(isDirty).mockReturnValue(new Promise(() => undefined));

      void loadResults([repo, plainRepo], 10, true);

      await vi.waitFor(() => expect(isDirty).toHaveBeenCalledTimes(2));
    });
  });
});
