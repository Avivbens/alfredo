import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSearch } from '../models/file-search.model';
import { loadResults } from './result-loader.service';
import { foldWorktrees } from './worktree-fold.service';
import { getCheckouts } from './worktree.service';

vi.mock('./worktree-fold.service', () => ({ foldWorktrees: vi.fn() }));
vi.mock('./worktree.service', () => ({ getCheckouts: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const PLAIN_REPO = '/Users/me/dev/alfredo';
const NOTES = '/Users/me/notes.md';

const repo: FileSearch = { path: REPO, type: 'folder' };
const plainRepo: FileSearch = { path: PLAIN_REPO, type: 'folder' };
const notes: FileSearch = { path: NOTES, type: 'file' };

describe('result-loader.service', () => {
  beforeEach(() => {
    vi.mocked(foldWorktrees).mockImplementation(async (results) => results);
    vi.mocked(getCheckouts).mockImplementation(async (path) => {
      if (path === REPO) {
        return [
          { path: REPO, branch: 'master' },
          { path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' },
        ];
      }

      return path === PLAIN_REPO ? [{ path: PLAIN_REPO, branch: 'master' }] : [];
    });
  });

  describe('loadResults', () => {
    it('should show only a repo with linked worktrees as a repo row', async () => {
      expect(await loadResults([repo, plainRepo, notes], 10, true)).toEqual([
        { kind: 'repo', main: { path: REPO, branch: 'master' }, worktreeCount: 1 },
        { kind: 'entry', file: plainRepo },
        { kind: 'entry', file: notes },
      ]);
      expect(getCheckouts).not.toHaveBeenCalledWith(NOTES);
    });

    it('should fold before cutting to the limit, so folded worktrees never leave the list short', async () => {
      const worktree: FileSearch = { path: `${REPO}@m4-libraries`, type: 'folder' };
      vi.mocked(foldWorktrees).mockImplementation(async (results) => results.filter((result) => result !== worktree));

      const rows = await loadResults([repo, worktree, plainRepo], 2, true);

      expect(rows.map((row) => (row.kind === 'repo' ? row.main.path : row.file.path))).toEqual([REPO, PLAIN_REPO]);
    });

    it('should leave git alone while the option is off, so searching costs what it did before', async () => {
      expect(await loadResults([repo, plainRepo, notes], 2, false)).toEqual([
        { kind: 'entry', file: repo },
        { kind: 'entry', file: plainRepo },
      ]);
      expect(foldWorktrees).not.toHaveBeenCalled();
      expect(getCheckouts).not.toHaveBeenCalled();
    });
  });
});
