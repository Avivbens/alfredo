import { glob } from 'glob';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import { $, quote } from 'zurk';
import { FileSearch } from '../models/file-search.model';
import { SearchOptions } from '../models/search-options.model';
import { FILE_TYPE_TO_QUERY_STRING } from './search.config';

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

  /**
   * Handle search locations
   */
  const parsedOnlyIn = (onlyIn ?? []).map((path) => path.replace('~', homedir()));
  const onlyInFlags = parsedOnlyIn.map((path) => `-onlyin '${path}'`);
  const onlyInLocationsQuery = onlyInFlags.join(' ');

  /**
   * Handle file types
   */
  const fileTypeQuery = FILE_TYPE_TO_QUERY_STRING[type];

  const nameFilterQuery = `'kMDItemFSName == "*${quote(name)}*" ${fileTypeQuery ? `&& ${fileTypeQuery}` : ``}'`;
  const { stdout } = await $({
    spawnOpts: { maxBuffer: 10_000_000 },
    args: [onlyInLocationsQuery, nameFilterQuery],
  })`mdfind`;

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

    const isIncludeGit = directoryEntities.some((entity) => entity.isDirectory() && entity.name === '.git');

    return isIncludeGit ? { path, type } : null;
  });

  const gitRes = await Promise.all(gitResPrm);

  return gitRes.filter(Boolean) as FileSearch[];
}
