import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSearch } from '../models/file-search.model';
import { foldWorktrees } from './worktree-fold.service';
import { getRepoOfWorktree } from './worktree.service';

vi.mock('./worktree.service', () => ({ getRepoOfWorktree: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const M4 = `${REPO}@m4-libraries`;
const M5 = `${REPO}@m5-shortcut-api`;
const OTHER = '/Users/me/dev/alfredo';

function folder(path: string): FileSearch {
  return { path, type: 'folder' };
}

describe('worktree-fold.service', () => {
  beforeEach(() => {
    vi.mocked(getRepoOfWorktree).mockImplementation(async (path) => (path.startsWith(`${REPO}@`) ? REPO : null));
  });

  describe('foldWorktrees', () => {
    it('should fold worktrees into their repo row, at the rank of the first one found', async () => {
      expect(await foldWorktrees([folder(M4), folder(OTHER), folder(REPO), folder(M5)])).toEqual([
        folder(REPO),
        folder(OTHER),
      ]);
    });

    it('should keep a worktree whose repo did not match the search, as nothing else leads to it', async () => {
      expect(await foldWorktrees([folder(M4)])).toEqual([folder(M4)]);
    });

    it('should not read git for a file result', async () => {
      const notes: FileSearch = { path: '/Users/me/notes.md', type: 'file' };

      expect(await foldWorktrees([notes])).toEqual([notes]);
      expect(getRepoOfWorktree).not.toHaveBeenCalled();
    });
  });
});
