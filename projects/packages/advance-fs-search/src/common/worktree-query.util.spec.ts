import { describe, expect, it } from 'vitest';
import { isWorktreeQuery, parseWorktreeQuery, toWorktreeQuery, toWorktreeRepos } from './worktree-query.util';

const REPO = '/Users/me/dev/ios-shortcuts';

describe('worktree-query.util', () => {
  describe('toWorktreeRepos', () => {
    it('should key repos by folder name, numbering ones that share it so each stays reachable', () => {
      expect(toWorktreeRepos(['/work/app', '/personal/app', '/oss/app'])).toEqual({
        app: '/work/app',
        'app (2)': '/personal/app',
        'app (3)': '/oss/app',
      });
    });
  });

  describe('isWorktreeQuery', () => {
    it('should recognise the query a repo row autocompletes to, and only that', () => {
      expect(isWorktreeQuery(toWorktreeQuery('ios-shortcuts'))).toBe(true);
      expect(isWorktreeQuery('ios-shortcuts')).toBe(false);
    });
  });

  describe('parseWorktreeQuery', () => {
    const repos = { 'ios-shortcuts': REPO, app: '/work/app', 'app (2)': '/personal/app' };

    it('should read back the query a repo row autocompletes to, with an empty filter', () => {
      expect(parseWorktreeQuery(toWorktreeQuery('ios-shortcuts'), repos)).toEqual({ repoPath: REPO, filter: '' });
    });

    it('should still resolve the repo when Alfred trims the trailing space', () => {
      expect(parseWorktreeQuery('⎇ ios-shortcuts', repos)).toEqual({ repoPath: REPO, filter: '' });
    });

    it('should treat what follows the repo name as the filter', () => {
      expect(parseWorktreeQuery('⎇ ios-shortcuts m4 lib', repos)).toEqual({ repoPath: REPO, filter: 'm4 lib' });
    });

    it('should prefer the longest name, so a numbered repo is not read as a filter', () => {
      expect(parseWorktreeQuery('⎇ app (2) main', repos)).toEqual({ repoPath: '/personal/app', filter: 'main' });
    });

    it('should not match a name that only shares a prefix', () => {
      expect(parseWorktreeQuery('⎇ ios-shortcuts-old', repos)).toBeNull();
    });
  });
});
