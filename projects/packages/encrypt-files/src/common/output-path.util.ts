import { access } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { ARCHIVE_NAME } from '../config/constants';

export function withSuffix(name: string, count: number): string {
  const extension = extname(name);
  const stem = name.slice(0, name.length - extension.length);

  return `${stem} ${count}${extension}`;
}

/** Follows Finder's Compress (one item keeps its full name), except that hidden names must not leak through the zip's own name */
export function toArchiveName(paths: string[], hideNames: boolean): string {
  if (hideNames || paths.length !== 1) {
    return ARCHIVE_NAME;
  }

  const [path = ''] = paths;
  return `${basename(path)}.zip`;
}

async function isTaken(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findFreePath(dir: string, fileName: string): Promise<string> {
  let candidate = join(dir, fileName);

  for (let count = 2; ; count++) {
    const taken = await isTaken(candidate);
    if (!taken) {
      return candidate;
    }

    candidate = join(dir, withSuffix(fileName, count));
  }
}

export function toPartialPath(finalPath: string): string {
  return join(dirname(finalPath), `.${basename(finalPath)}.partial`);
}
