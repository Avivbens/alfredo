import { IconService } from 'fast-alfred';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorktreesRoute } from '../models/routes.model';
import { loadCheckoutOutput } from './checkout-output.service';
import { getCheckouts } from './worktree.service';

vi.mock('./worktree.service', () => ({ getCheckouts: vi.fn() }));

const REPO = '/Users/me/dev/ios-shortcuts';
const icons = new IconService();

function toRoute(filter: string): WorktreesRoute {
  return { name: 'worktrees', state: { repoPath: REPO }, filter };
}

describe('checkout-output.service', () => {
  beforeEach(() => {
    vi.mocked(getCheckouts).mockResolvedValue([
      { path: REPO, branch: 'master' },
      { path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' },
      { path: `${REPO}@m5-shortcut-api`, branch: 'feat/builder-ts-source' },
    ]);
  });

  describe('loadCheckoutOutput', () => {
    it('should list every checkout of the drilled repo before anything is typed', async () => {
      const { items } = await loadCheckoutOutput(toRoute(''), icons);

      expect(items).toHaveLength(3);
      expect(getCheckouts).toHaveBeenCalledWith(REPO);
    });

    it.each([
      ['builder', 'ios-shortcuts@m5-shortcut-api'],
      ['M4', 'ios-shortcuts@m4-libraries'],
    ])('should match %s against the branch or the folder name, in any case', async (filter, title) => {
      const { items } = await loadCheckoutOutput(toRoute(filter), icons);

      expect(items.map((item) => item.title)).toEqual([title]);
    });
  });
});
