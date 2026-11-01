import { hoursToMilliseconds } from 'date-fns';
import { millisecondsInWeek } from 'date-fns/constants';

export const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
export const DEFAULT_RESULTS_LIMIT = 20;

/** GIPHY beta keys allow 100 calls an hour, so reopening the last search reads it from here instead of spending one. */
export const CACHE_LAST_SEARCH_KEY = 'last-search';
export const SEARCH_CACHE_TTL = hoursToMilliseconds(1);

/**
 * Alfred kills the previous run on every keystroke, so only a query the user paused on reaches GIPHY.
 * Long enough to skip most gaps between words, since every call counts against a beta key's 100 an hour.
 */
export const SEARCH_DEBOUNCE_MS = 500;

export const THUMBNAILS_DIR = 'thumbnails';
export const CACHED_FILES_MAX_AGE = millisecondsInWeek;
