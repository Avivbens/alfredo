import type { FuseOptionKey } from 'fuse.js';
import { IUIBookmark } from '../models/bookmark.schema';
import type { SearchedTab } from '../models/chrome-tabs.schema';

type SearchField = keyof IUIBookmark;
export const SEARCH_FIELDS_CONFIG: SearchField[] = ['name', 'url'];

export const TABS_SEARCH_FIELDS_CONFIG: FuseOptionKey<SearchedTab>[] = [
  { name: 'title', weight: 2 },
  { name: 'url', weight: 1 },
];
