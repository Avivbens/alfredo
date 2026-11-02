import type { Dirent } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { toNameWithOwner } from '../common/remote-url.util';
import type { Clone } from '../models/clone.schema';

const ORIGIN_SECTION = /^\s*\[remote "origin"\]\s*$/;
const ANY_SECTION = /^\s*\[/;
const URL_LINE = /^\s*url\s*=\s*(.+?)\s*$/;

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);

    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function readEntries(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readOriginUrl(repo: string): Promise<string | null> {
  try {
    const config = await readFile(join(repo, '.git', 'config'), 'utf8');
    let inOrigin = false;
    for (const line of config.split('\n')) {
      if (ANY_SECTION.test(line)) {
        inOrigin = ORIGIN_SECTION.test(line);
        continue;
      }
      const url = inOrigin ? URL_LINE.exec(line)?.[1] : undefined;
      if (url) {
        return url;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** A `.git` file marks a linked worktree, so only a `.git` directory counts as a main clone. */
async function scan(dir: string, level: number, depth: number): Promise<Clone[]> {
  const hasGitDir = await isDirectory(join(dir, '.git'));
  if (hasGitDir) {
    const url = await readOriginUrl(dir);
    const nameWithOwner = url ? toNameWithOwner(url) : null;

    return nameWithOwner ? [{ path: dir, nameWithOwner }] : [];
  }
  if (level >= depth) {
    return [];
  }

  const entries = await readEntries(dir);
  const children = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .map((entry) => scan(join(dir, entry.name), level + 1, depth));

  const clones = await Promise.all(children);

  return clones.flat();
}

export async function findClones(roots: string[], depth: number): Promise<Clone[]> {
  const found = await Promise.all(roots.map((root) => scan(resolve(root), 0, depth)));
  const clones = found.flat();
  const entries = clones.map((clone) => [clone.path, clone] as const);
  const byPath = new Map(entries);
  const unique = [...byPath.values()];

  return unique.sort((a, b) => a.path.localeCompare(b.path));
}
