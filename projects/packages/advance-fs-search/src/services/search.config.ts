import { minutesToSeconds, secondsToMilliseconds } from 'date-fns';
import { SearchOptions } from '../models/search-options.model';

export const FILE_TYPE_TO_QUERY_STRING: Record<SearchOptions['type'], string> = {
  folder: 'kMDItemContentType == "public.folder"',
  file: 'kMDItemContentType != "public.folder"',
  all: '',
};

export const SEARCH_CACHE_SECONDS = minutesToSeconds(20);

/** The main search runs as you type, so its status check gets a tighter cap than the ⎇ list's. */
export const SEARCH_STATUS_TIMEOUT_MS = secondsToMilliseconds(0.3);
