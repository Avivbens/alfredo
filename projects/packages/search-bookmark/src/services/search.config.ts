import { IUIBookmark } from '../models/bookmark.model';

type SearchField = keyof IUIBookmark;
export const SEARCH_FIELDS_CONFIG: SearchField[] = ['name', 'url'];
