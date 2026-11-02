import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckout, getCheckouts } from '@alfredo/git-worktrees';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import { isDirty } from './dirty.service';
import { SEARCH_STATUS_TIMEOUT_MS } from './search.config';
import { foldWorktrees } from './worktree-fold.service';

interface ResultCheckouts {
  file: FileSearch;
  checkouts: Worktree[];
}

export async function loadResults(
  results: FileSearch[],
  limit: number,
  searchWorktrees: boolean,
): Promise<ResultRow[]> {
  if (!searchWorktrees) {
    return Promise.all(results.slice(0, limit).map(loadPlainRow));
  }

  const folded = await foldWorktrees(results);
  const withCheckouts = await Promise.all(folded.slice(0, limit).map(getResultCheckouts));

  return Promise.all(withCheckouts.map(loadFoldedRow));
}

async function getResultCheckouts(file: FileSearch): Promise<ResultCheckouts> {
  return { file, checkouts: file.type === 'folder' ? await getCheckouts(file.path) : [] };
}

function toEntryRow(file: FileSearch): ResultRow {
  return { kind: 'entry', file };
}

async function loadCheckoutRow(checkout: Worktree): Promise<ResultRow> {
  return { kind: 'checkout', checkout, dirty: await isDirty(checkout.path, SEARCH_STATUS_TIMEOUT_MS) };
}

/** Files are never read, so a search full of files costs no git lookups. */
async function loadPlainRow(file: FileSearch): Promise<ResultRow> {
  if (file.type !== 'folder') {
    return toEntryRow(file);
  }

  const checkout = await getCheckout(file.path);
  if (!checkout) {
    return toEntryRow(file);
  }

  return loadCheckoutRow(checkout);
}

/** Only a repo with linked worktrees gets the ⎇ row. Other checkouts, lone worktrees too, show their branch and ●. */
async function loadFoldedRow({ file, checkouts }: ResultCheckouts): Promise<ResultRow> {
  const [main, ...linked] = checkouts;
  if (main && linked.length) {
    return {
      kind: 'repo',
      main,
      worktreeCount: linked.length,
      dirty: await isDirty(main.path, SEARCH_STATUS_TIMEOUT_MS),
    };
  }
  if (main) {
    return loadCheckoutRow(main);
  }

  return loadPlainRow(file);
}
