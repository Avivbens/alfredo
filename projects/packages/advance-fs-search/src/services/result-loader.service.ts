import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import type { Worktree } from '../models/worktree.model';
import { foldWorktrees } from './worktree-fold.service';
import { getCheckouts } from './worktree.service';

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
    return results.slice(0, limit).map(toEntryRow);
  }

  const folded = await foldWorktrees(results);
  const withCheckouts = await Promise.all(folded.slice(0, limit).map(getResultCheckouts));

  return withCheckouts.map(toResultRow);
}

async function getResultCheckouts(file: FileSearch): Promise<ResultCheckouts> {
  return { file, checkouts: file.type === 'folder' ? await getCheckouts(file.path) : [] };
}

function toEntryRow(file: FileSearch): ResultRow {
  return { kind: 'entry', file };
}

function toResultRow({ file, checkouts }: ResultCheckouts): ResultRow {
  const [main, ...linked] = checkouts;
  if (!main || !linked.length) {
    return toEntryRow(file);
  }

  return { kind: 'repo', main, worktreeCount: linked.length };
}
