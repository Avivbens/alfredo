import { IconService } from 'fast-alfred';
import { describe, expect, it } from 'vitest';
import type { ResultRow } from '../models/result-row.model';
import { toCheckoutItem, toResultItems } from './file-item.service';
import { WORKTREE_QUERY_PREFIX } from './search.config';

const REPO = '/Users/me/dev/ios-shortcuts';
const icons = new IconService();

describe('file-item.service', () => {
  describe('toResultItems', () => {
    const repoRow: ResultRow = {
      kind: 'repo',
      main: { path: REPO, branch: 'master' },
      worktreeCount: 2,
      repoKey: 'ios-shortcuts',
    };

    it.each([
      ['folder', 'genericFolder'],
      ['file', 'genericDocument'],
    ] as const)('should open a %s result directly, with its own icon', (type, icon) => {
      const [item] = toResultItems({ kind: 'entry', file: { path: REPO, type } }, icons);

      expect(item).toMatchObject({ arg: REPO, icon: { path: icons.getIcon(icon) } });
    });

    it('should open the repo itself from its first row', () => {
      const [repo] = toResultItems(repoRow, icons);

      expect(repo).toMatchObject({ arg: REPO, subtitle: `master · ${REPO}` });
    });

    it('should drill into the checkouts from the second row, leaving the cursor ready for a filter', () => {
      const [, worktrees] = toResultItems(repoRow, icons);

      expect(worktrees).toMatchObject({
        title: 'ios-shortcuts ⎇ 2 worktrees',
        valid: false,
        autocomplete: `${WORKTREE_QUERY_PREFIX}ios-shortcuts `,
      });
    });

    it('should leave the worktrees row without a uid, so it never shares the knowledge of the repo row', () => {
      const [, worktrees] = toResultItems(repoRow, icons);

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
