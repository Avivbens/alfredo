import type { AlfredListItem } from 'fast-alfred';
import { basename } from 'node:path';
import { joinSubtitle, pluralize } from '../common/text.util';
import { toWorktreeQuery } from '../common/worktree-query.util';
import type { AlfredIcons } from '../models/alfred.model';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import type { Worktree } from '../models/worktree.model';

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

function toFileIcon({ type }: FileSearch, icons: AlfredIcons): string {
  return icons.getIcon(type === 'folder' ? 'genericFolder' : 'genericDocument');
}

/**
 * Alfred autocompletes an invalid item on ↩, re-running the filter with the query that lists the checkouts.
 * No uid, so it never shares the repo row's knowledge.
 */
function toWorktreesItem(repoPath: string, worktreeCount: number, repoKey: string, icons: AlfredIcons): AlfredListItem {
  return {
    title: `${basename(repoPath)} ⎇ ${pluralize(worktreeCount, 'worktree')}`,
    subtitle: joinSubtitle('↩ choose a checkout', repoPath),
    icon: { path: icons.getIcon('utilitiesFolder') },
    valid: false,
    autocomplete: toWorktreeQuery(repoKey),
  };
}

export function toCheckoutItem({ path, branch }: Worktree, icons: AlfredIcons): AlfredListItem {
  return toFileItem(path, icons.getIcon('genericFolder'), joinSubtitle(branch, path));
}

export function toResultItems(row: ResultRow, icons: AlfredIcons): AlfredListItem[] {
  switch (row.kind) {
    case 'entry':
      return [toFileItem(row.file.path, toFileIcon(row.file, icons))];

    case 'repo':
      return [toCheckoutItem(row.main, icons), toWorktreesItem(row.main.path, row.worktreeCount, row.repoKey, icons)];
  }
}
