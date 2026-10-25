import type { FileSearch } from '../models/file-search.model';
import { getRepoOfWorktree } from './worktree.service';

/** A linked worktree whose repo is also a result folds into the repo row, which lists it on ↩. */
export async function foldWorktrees(results: FileSearch[]): Promise<FileSearch[]> {
  const resultPaths = new Set(results.map(({ path }) => path));
  const targets = await Promise.all(results.map((result) => getFoldTarget(result, resultPaths)));

  return [...new Map(targets.map(toPathEntry)).values()];
}

async function getFoldTarget(result: FileSearch, resultPaths: Set<string>): Promise<FileSearch> {
  const repo = result.type === 'folder' ? await getRepoOfWorktree(result.path) : null;
  return repo && resultPaths.has(repo) ? { path: repo, type: 'folder' } : result;
}

function toPathEntry(result: FileSearch): [string, FileSearch] {
  return [result.path, result];
}
