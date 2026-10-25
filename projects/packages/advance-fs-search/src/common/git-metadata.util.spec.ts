import { describe, expect, it } from 'vitest';
import { parseGitdirPointer, parseHead, toRepoOfAdminDir } from './git-metadata.util';

const REPO = '/Users/me/dev/ios-shortcuts';

/** The HEAD of `ios-shortcuts@m5-shortcut-api`, as git writes it for a detached checkout. */
const DETACHED_SHA = 'c66d5dc8682ac2044bf7f4ba9a037faefa67b8f1';

describe('git-metadata.util', () => {
  describe('parseHead', () => {
    it('should keep slashes in the branch name', () => {
      expect(parseHead('ref: refs/heads/fix/generator-nx-install')).toBe('fix/generator-nx-install');
    });

    it('should shorten a detached HEAD the way git prints it', () => {
      expect(parseHead(DETACHED_SHA)).toBe('c66d5dc');
    });
  });

  describe('parseGitdirPointer', () => {
    it('should read where a linked worktree points', () => {
      expect(parseGitdirPointer(`gitdir: ${REPO}/.git/worktrees/m4-libraries`)).toBe(
        `${REPO}/.git/worktrees/m4-libraries`,
      );
    });

    it('should read nothing from a file that is not a gitdir pointer', () => {
      expect(parseGitdirPointer('[core]\n\tbare = false')).toBeNull();
    });
  });

  describe('toRepoOfAdminDir', () => {
    it('should find the repo above a linked worktree admin dir', () => {
      expect(toRepoOfAdminDir(`${REPO}/.git/worktrees/m4-libraries`)).toBe(REPO);
    });

    it('should not read a submodule as a worktree, as its gitdir lives under .git/modules', () => {
      expect(toRepoOfAdminDir(`${REPO}/.git/modules/vendor`)).toBeNull();
    });
  });
});
