import { IUIBookmark } from '../models/bookmark.model';
import { SEARCH_FIELDS_CONFIG } from './search.config';

export async function searchBookmarks(
  bookmarks: IUIBookmark[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<IUIBookmark[]> {
  const Fuse = (await import('fuse.js')).default;

  const fuse = new Fuse(bookmarks, {
    keys: SEARCH_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });

  return res.map((item) => item.item);
}
