import { glob } from 'glob';
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import { promisify } from 'node:util';
import { FileSearch } from '../models/file-search.model';
import { SearchOptions } from '../models/search-options.model';
import { FILE_TYPE_TO_QUERY_STRING } from './search.config';

const execFileAsync = promisify(execFile);

const MDFIND_MAX_BUFFER = 10_000_000;

/**
 * mdfind runs without a shell, so the typed name only has to stay inside its Spotlight value,
 * where `'` ends the value and `\` escapes.
 */
export function toMdfindArgs(name: string, fileTypeQuery: string, onlyIn: string[]): string[] {
  const spotlightName = name.replace(/[\\']/g, '\\$&');
  const nameQuery = `kMDItemFSName == '*${spotlightName}*'`;
  const query = fileTypeQuery ? `${nameQuery} && ${fileTypeQuery}` : nameQuery;

  return [...onlyIn.flatMap((path) => ['-onlyin', path]), query];
}

export async function searchInFileSystem(options: SearchOptions): Promise<FileSearch[]> {
  const {
    name,
    type,
    excludeGit,
    excludeHidden,
    excludeNodeModules,
    excludePaths,
    onlyIn,
    forceInclude,
    gitReposOnly,
    searchWorktrees,
  } = options;

  const forceIncludedPaths = await glob(forceInclude ?? []);
  const forceIncludeMap = new Set(forceIncludedPaths ?? []);

  /**
   * Handle the case when we need to search only in the root paths and force include some paths
   */
  const filterFunction = (path: string) => {
    const entityName = basename(path);
    return entityName.includes(name);
  };

  const filteredForced = forceIncludedPaths?.filter(filterFunction) ?? [];
  const filteredRootPaths = onlyIn?.filter(filterFunction) ?? [];

  const parsedOnlyIn = (onlyIn ?? []).map((path) => path.replace('~', homedir()));
  const mdfindArgs = toMdfindArgs(name, FILE_TYPE_TO_QUERY_STRING[type], parsedOnlyIn);
  const { stdout } = await execFileAsync('mdfind', mdfindArgs, { maxBuffer: MDFIND_MAX_BUFFER });

  /**
   * Parse the output of mdfind command
   */
  const parsedQueryRes = stdout.split('\n').filter(Boolean);
  const uniqueParsedQueryRes = Array.from(new Set([...filteredForced, ...filteredRootPaths, ...parsedQueryRes]));

  /**
   * Apply smart filtering
   */
  const filtered = uniqueParsedQueryRes.filter((path) => {
    /**
     * Force include the path even if it's bypassing exclude settings
     */
    if (forceIncludeMap.has(path)) {
      return true;
    }

    const isExcluded = excludePaths?.some((excludePath) => new RegExp(excludePath).test(path));
    if (isExcluded) {
      return false;
    }

    if (excludeNodeModules && path.includes('node_modules')) {
      return false;
    }

    if (excludeHidden && path.includes('/.')) {
      return false;
    }

    if (excludeGit && path.includes('/.git')) {
      return false;
    }

    return true;
  });

  const resPrm = filtered.map(async (path) => {
    const fileData = await stat(path);

    const type = fileData.isDirectory() ? 'folder' : fileData.isFile() ? 'file' : undefined;
    return {
      path,
      type,
    } satisfies FileSearch;
  });

  const res: FileSearch[] = await Promise.all(resPrm);

  if (!gitReposOnly) {
    return res;
  }

  /**
   * Handle the case when we need to search only in git repositories
   */
  const gitResPrm = res.map(async ({ path, type }) => {
    /**
     * Force include the path even if it's bypassing the git check
     */
    if (forceIncludeMap.has(path)) {
      return { path, type };
    }

    if (type === 'file') {
      return null;
    }

    const directoryEntities = await readdir(path, { withFileTypes: true }).catch(() => []);

    const isIncludeGit = directoryEntities.some(
      (entity) => entity.name === '.git' && (entity.isDirectory() || (searchWorktrees && entity.isFile())),
    );

    return isIncludeGit ? { path, type } : null;
  });

  const gitRes = await Promise.all(gitResPrm);

  return gitRes.filter(Boolean) as FileSearch[];
}
