import { lstat, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { withSuffix } from '../common/output-path.util';
import { SKIPPED_NAMES } from '../config/constants';
import type { ZipSource } from '../models/zip-source.model';

/**
 * Only plain files and folders are kept: a symlink could loop back up the tree, and reading a named pipe, socket or
 * device blocks forever. Finder's .DS_Store noise never ships either.
 */
async function collectPath(path: string, entryName: string): Promise<ZipSource[]> {
  const stats = await lstat(path);
  const metadata = { lastModDate: stats.mtime, mode: stats.mode };
  if (SKIPPED_NAMES.includes(basename(path))) {
    return [];
  }

  if (stats.isFile()) {
    return [{ kind: 'file', entryName, sourcePath: path, size: stats.size, ...metadata }];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  const children = await readdir(path);
  const sorted = children.toSorted((a, b) => a.localeCompare(b));
  const nested = await Promise.all(sorted.map((child) => collectPath(join(path, child), `${entryName}/${child}`)));

  return [{ kind: 'directory', entryName: `${entryName}/`, ...metadata }, ...nested.flat()];
}

/** Names are compared ignoring case, because Finder and iPhone Files would overwrite one with the other on extract */
function toUniqueNames(paths: string[]): string[] {
  const used = new Set<string>();

  return paths.map((path) => {
    const name = basename(path);
    let unique = name;
    for (let count = 2; used.has(unique.toLowerCase()); count++) {
      unique = withSuffix(name, count);
    }

    used.add(unique.toLowerCase());
    return unique;
  });
}

export async function collectEntries(paths: string[]): Promise<ZipSource[]> {
  const names = toUniqueNames(paths);
  const collected = await Promise.all(paths.map((path, index) => collectPath(path, names[index] ?? basename(path))));

  return collected.flat();
}
