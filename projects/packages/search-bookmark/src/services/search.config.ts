import { IUIBookmark } from '../models/bookmark.schema';

type SearchField = keyof IUIBookmark;
export const SEARCH_FIELDS_CONFIG: SearchField[] = ['name', 'url'];
