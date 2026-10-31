import { IconService, RouterService } from 'fast-alfred';
import { describe, expect, it } from 'vitest';
import type { ResultRow } from '../models/result-row.model';
import { type AppRouter, ROUTES } from '../models/routes.model';
import { toCheckoutItem, toResultItems } from './file-item.service';

const REPO = '/Users/me/dev/ios-shortcuts';
const icons = new IconService();

function newRouter(input = '', variable?: string): AppRouter {
  return new RouterService(ROUTES, input, variable);
}

describe('file-item.service', () => {
  describe('toResultItems', () => {
    const repoRow: ResultRow = { kind: 'repo', main: { path: REPO, branch: 'master' }, worktreeCount: 2 };

    it.each([
      ['folder', 'genericFolder'],
      ['file', 'genericDocument'],
    ] as const)('should open a %s result directly, with its own icon', (type, icon) => {
      const [item] = toResultItems({ kind: 'entry', file: { path: REPO, type } }, icons, newRouter());

      expect(item).toMatchObject({ arg: REPO, icon: { path: icons.getIcon(icon) } });
    });

    it('should open the repo itself from its first row', () => {
      const [repo] = toResultItems(repoRow, icons, newRouter());

      expect(repo).toMatchObject({ arg: REPO, subtitle: `master · ${REPO}` });
    });

    it('should drill into the checkouts from the second row, leaving the cursor ready for a filter', () => {
      const [, worktrees] = toResultItems(repoRow, icons, newRouter());

      expect(worktrees).toMatchObject({
        title: 'ios-shortcuts ⎇ 2 worktrees',
        valid: false,
        autocomplete: '⎇ ios-shortcuts ',
      });
    });

    it('should number repos that share a folder name, so each one opens its own checkouts', () => {
      const router = newRouter();
      const namesake: ResultRow = {
        kind: 'repo',
        main: { path: '/Users/me/work/ios-shortcuts', branch: 'main' },
        worktreeCount: 1,
      };

      const autocompletes = [repoRow, namesake].map((row) => toResultItems(row, icons, router)[1]?.autocomplete);

      expect(autocompletes).toEqual(['⎇ ios-shortcuts ', '⎇ ios-shortcuts (2) ']);
    });

    it('should hand the repo path to the next run, once the user drills in', () => {
      const router = newRouter();
      toResultItems(repoRow, icons, router);

      /** The variable name is fast-alfred's own, so the spec passes along whatever it emitted. */
      const [variable] = Object.values(router.toVariables() ?? {});

      expect(newRouter('⎇ ios-shortcuts ', variable).match()).toEqual({
        name: 'worktrees',
        state: { repoPath: REPO },
        filter: '',
      });
    });

    it('should leave the worktrees row without a uid, so it never shares the knowledge of the repo row', () => {
      const [, worktrees] = toResultItems(repoRow, icons, newRouter());

      expect(worktrees?.uid).toBeUndefined();
    });
  });

  describe('toCheckoutItem', () => {
    it('should open the checkout on ↩ and show its branch', () => {
      const item = toCheckoutItem({ path: `${REPO}@m4-libraries`, branch: 'fix/generator-nx-install' }, icons);

      expect(item).toMatchObject({ title: 'ios-shortcuts@m4-libraries', arg: `${REPO}@m4-libraries` });
      expect(item.subtitle).toBe(`fix/generator-nx-install · ${REPO}@m4-libraries`);
    });
  });
});
