import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toWorktreeQuery } from '../common/worktree-query.util';
import type { AlfredIcons } from '../models/alfred.model';
import { loadCheckoutOutput } from './checkout-output.service';
import { getCheckouts } from './worktree.service';

vi.mock('./worktree.service', () => ({ getCheckouts: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const repos = { 'ios-shortcuts': REPO };
const icons = { getIcon: (name: string) => `${name}.icns` } as unknown as AlfredIcons;

describe('checkout-output.service', () => {
  beforeEach(() => {
    vi.mocked(getCheckouts).mockResolvedValue([
      { path: REPO, branch: 'master' },
      { path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' },
      { path: `${REPO}@m5-shortcut-api`, branch: 'feat/builder-ts-source' },
    ]);
  });

  describe('loadCheckoutOutput', () => {
    it('should list only the checkouts matching what is typed after the repo name', async () => {
      const { items } = await loadCheckoutOutput(`${toWorktreeQuery('ios-shortcuts')}builder`, repos, icons);

      expect(items.map(({ title }) => title)).toEqual(['ios-shortcuts@m5-shortcut-api']);
    });

    it('should list nothing for a repo the search run did not offer, rather than guess one', async () => {
      const { items } = await loadCheckoutOutput(toWorktreeQuery('unknown'), repos, icons);

      expect(items).toEqual([]);
      expect(getCheckouts).not.toHaveBeenCalled();
    });

    it('should hand the repos back to Alfred, so they are still there on the next keystroke', async () => {
      const { variables } = await loadCheckoutOutput(toWorktreeQuery('ios-shortcuts'), repos, icons);

      expect(variables).toEqual({ worktree_repos: JSON.stringify(repos) });
    });
  });
});
