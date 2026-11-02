import type { FuseOptionKey } from 'fuse.js';
import { IUIBookmark } from '../models/bookmark.schema';
import { SEARCH_FIELDS_CONFIG } from './search.config';

export async function fuzzySearch<T>(
  items: T[],
  keys: FuseOptionKey<T>[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<T[]> {
  const Fuse = (await import('fuse.js')).default;

  const fuse = new Fuse(items, {
    keys,
    isCaseSensitive: false,
    shouldSort: true,
    findAllMatches: true,
    ignoreLocation: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });

  return res.map((item) => item.item);
}

export async function searchBookmarks(
  bookmarks: IUIBookmark[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<IUIBookmark[]> {
  return fuzzySearch(bookmarks, SEARCH_FIELDS_CONFIG, searchTerm, limit, threshold);
}
