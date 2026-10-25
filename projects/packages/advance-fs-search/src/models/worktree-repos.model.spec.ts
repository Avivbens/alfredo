import { describe, expect, it } from 'vitest';
import { Variables } from '../common/variables';
import { parseWorktreeRepos, toWorktreeVariables } from './worktree-repos.model';

describe('worktree-repos.model', () => {
  describe('parseWorktreeRepos', () => {
    it('should read back the repos a previous run handed to Alfred', () => {
      const repos = { 'ios-shortcuts': '/Users/me/dev/ios-shortcuts', 'app (2)': '/personal/app' };

      expect(parseWorktreeRepos(toWorktreeVariables(repos)[Variables.WORKTREE_REPOS] ?? '')).toEqual(repos);
    });
  });
});
