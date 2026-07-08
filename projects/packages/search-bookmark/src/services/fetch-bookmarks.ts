import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { IBookmark, IBookmarkRes, IUIBookmark, Type } from '../models/bookmark.model';

/**
 * Managed / signed-in Chrome profiles keep their bookmarks in `AccountBookmarks`
 * while the local `Bookmarks` file stays empty, so we read both and merge them.
 */
const BOOKMARK_FILES = ['Bookmarks', 'AccountBookmarks'];

const bookmarkPaths = (profile: string): string[] =>
  BOOKMARK_FILES.map((file) => join(homedir(), `/Library/Application Support/Google/Chrome/${profile}/${file}`));

export async function getBookmarks(profiles: string[]): Promise<IUIBookmark[]> {
  const targets = profiles.flatMap((profile) => bookmarkPaths(profile).map((path) => ({ profile, path })));

  const data = await Promise.all(
    targets.map(async ({ profile, path }) => {
      const payload: string | null = await readFile(path, 'utf8').catch(() => null);
      return { profile, payload };
    }),
  );

  return data.flatMap(({ payload, profile }) => {
    if (!payload) {
      return [];
    }

    const { roots }: IBookmarkRes = JSON.parse(payload);
    return [
      ...recursivelyFlatBookmarks(roots.bookmark_bar.children ?? [], profile),
      ...recursivelyFlatBookmarks(roots.other.children ?? [], profile),
    ];
  });
}

function recursivelyFlatBookmarks(bookmarks: IBookmark[], profile: string, prefix = ''): IUIBookmark[] {
  const flatBookmarks: IUIBookmark[] = [];
  bookmarks.forEach(({ name, url, type, children }: IBookmark) => {
    if (type === Type.Folder) {
      flatBookmarks.push(...recursivelyFlatBookmarks(children ?? [], profile, `${prefix}${name} > `));
    } else {
      flatBookmarks.push({
        name: `${prefix}${name}`,
        url: url ?? '',
        type,
        profile,
      });
    }
  });

  return flatBookmarks;
}
