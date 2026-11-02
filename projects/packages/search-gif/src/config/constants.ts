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
export const GIFS_DIR = 'gifs';

/** A clipboard manager keeps only a reference to a copied GIF, so the file has to outlive later pastes. */
export const CACHED_FILES_MAX_AGE = millisecondsInWeek;

export const PREVIEWS_DIR = 'previews';
export const PRELOAD_SCRIPT = 'preload-previews.js';

/** A preview only matters while its search is cached, and weighs up to 2 MB, so it expires with the search. */
export const PREVIEWS_MAX_AGE = SEARCH_CACHE_TTL;

/** Previews come from GIPHY's media servers, not the keyed API, so only the connection limits how many run at once. */
export const PRELOAD_CONCURRENCY = 4;

/** The list re-runs from the cached search at this pace, pointing ⇧ at each preview as it lands, for 10 seconds at most. */
export const PREVIEW_RERUN_SECONDS = 0.5;
export const PREVIEW_MAX_RERUNS = 20;
