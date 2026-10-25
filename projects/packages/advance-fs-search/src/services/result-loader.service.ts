import { toWorktreeRepos } from '../common/worktree-query.util';
import type { FileSearch } from '../models/file-search.model';
import type { ResultRow } from '../models/result-row.model';
import type { WorktreeRepos } from '../models/worktree-repos.model';
import type { Worktree } from '../models/worktree.model';
import { foldWorktrees } from './worktree-fold.service';
import { getCheckouts } from './worktree.service';

interface LoadedResults {
  rows: ResultRow[];
  repos: WorktreeRepos;
}

interface ResultCheckouts {
  file: FileSearch;
  checkouts: Worktree[];
}

export async function loadResults(
  results: FileSearch[],
  limit: number,
  searchWorktrees: boolean,
): Promise<LoadedResults> {
  if (!searchWorktrees) {
    return { rows: results.slice(0, limit).map(toEntryRow), repos: {} };
  }

  const folded = await foldWorktrees(results);
  const withCheckouts = await Promise.all(folded.slice(0, limit).map(getResultCheckouts));
  const repos = toWorktreeRepos(withCheckouts.filter(hasWorktrees).map(({ file }) => file.path));
  const keysByPath = toKeysByPath(repos);

  return { rows: withCheckouts.map((result) => toResultRow(result, keysByPath)), repos };
}

async function getResultCheckouts(file: FileSearch): Promise<ResultCheckouts> {
  return { file, checkouts: file.type === 'folder' ? await getCheckouts(file.path) : [] };
}

function hasWorktrees({ checkouts }: ResultCheckouts): boolean {
  return checkouts.length > 1;
}

function toKeysByPath(repos: WorktreeRepos): Map<string, string> {
  return new Map(Object.entries(repos).map(([key, path]) => [path, key]));
}

function toEntryRow(file: FileSearch): ResultRow {
  return { kind: 'entry', file };
}

function toResultRow({ file, checkouts }: ResultCheckouts, keysByPath: Map<string, string>): ResultRow {
  const [main, ...linked] = checkouts;
  const repoKey = keysByPath.get(file.path);
  if (!main || !repoKey) {
    return toEntryRow(file);
  }

  return { kind: 'repo', main, worktreeCount: linked.length, repoKey };
}
