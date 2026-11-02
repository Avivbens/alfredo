import type { AlfredListItem, IconService } from 'fast-alfred';
import { basename } from 'node:path';
import type { Worktree } from '@alfredo/git-worktrees';
import { TREE_GLYPHS, joinSubtitle, pluralize } from '../common/text.util';
import type { CheckoutLayer, StackHeaderEntry } from '../models/checkout-entry.model';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import type { AppRouter } from '../models/routes.model';

/** IconService has no key for CoreTypes' stacked-pages icon, so it is asked for by file name. */
const STACK_ICON = 'MultipleItemsIcon';

function toFileItem(path: string, icon: string, subtitle = path): AlfredListItem {
  return {
    title: basename(path),
    subtitle,
    arg: path,
    icon: { path: icon },
    uid: path,
    type: 'file:skipcheck',
  };
}

function toFileIcon({ type }: FileSearch, icons: IconService): string {
  return icons.getIcon(type === 'folder' ? 'genericFolder' : 'genericDocument');
}

/** No uid, so it never shares the repo row's knowledge. */
function toWorktreesItem(
  repoPath: string,
  worktreeCount: number,
  icons: IconService,
  router: AppRouter,
): AlfredListItem {
  return router.link('worktrees', {
    label: basename(repoPath),
    state: { repoPath },
    title: `${basename(repoPath)} ⎇ ${pluralize(worktreeCount, 'worktree')}`,
    subtitle: joinSubtitle('↩ choose a checkout', repoPath),
    icon: { path: icons.getIcon('utilitiesFolder') },
  });
}

export function toStackHeaderItem({ title, subtitle }: StackHeaderEntry, icons: IconService): AlfredListItem {
  const iconPath = icons.getIcon(STACK_ICON);

  return { title: `${TREE_GLYPHS.header}${title}`, subtitle, valid: false, icon: { path: iconPath } };
}

function toLayerLabel({ position, size, prNumber }: CheckoutLayer): string {
  return prNumber === undefined ? `${position}/${size}` : `${position}/${size} #${prNumber}`;
}

function toCheckoutSubtitle(branch: string, path: string, layer?: CheckoutLayer): string {
  if (!layer) {
    return joinSubtitle(branch, path);
  }
  const label = toLayerLabel(layer);

  return joinSubtitle(label, branch, path);
}

export function toCheckoutItem(
  { path, branch }: Worktree,
  icons: IconService,
  { dirty = false, layer, glyph = '' }: { dirty?: boolean; layer?: CheckoutLayer; glyph?: string } = {},
): AlfredListItem {
  const subtitle = toCheckoutSubtitle(branch, path, layer);
  const icon = icons.getIcon('genericFolder');
  const item = toFileItem(path, icon, subtitle);

  return { ...item, title: `${glyph}${item.title}${dirty ? ' ●' : ''}` };
}

export function toResultItems(row: ResultRow, icons: IconService, router: AppRouter): AlfredListItem[] {
  switch (row.kind) {
    case 'entry':
      return [toFileItem(row.file.path, toFileIcon(row.file, icons))];

    case 'checkout':
      return [toCheckoutItem(row.checkout, icons, { dirty: row.dirty })];

    case 'repo':
      return [
        toCheckoutItem(row.main, icons, { dirty: row.dirty }),
        toWorktreesItem(row.main.path, row.worktreeCount, icons, router),
      ];
  }
}
