import type { AlfredListItem, IconService } from 'fast-alfred';
import { basename } from 'node:path';
import type { Worktree } from '@alfredo/git-worktrees';
import { joinSubtitle, pluralize } from '../common/text.util';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import type { AppRouter } from '../models/routes.model';

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

export function toCheckoutItem(
  { path, branch }: Worktree,
  icons: IconService,
  { dirty = false }: { dirty?: boolean } = {},
): AlfredListItem {
  const item = toFileItem(path, icons.getIcon('genericFolder'), joinSubtitle(branch, path));

  return { ...item, title: dirty ? `${item.title} ●` : item.title };
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
