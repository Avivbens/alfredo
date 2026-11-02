import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns';

export const CLONES_CACHE_TTL = minutesToMilliseconds(10);

export const PRS_CACHE_KEY = 'prs';
export const PRS_CACHE_TTL = minutesToMilliseconds(1);

/** Below this age a miss is trusted, so typing never hammers `gh`. */
export const MIN_REFETCH_AGE_MS = secondsToMilliseconds(10);

export const RECENT_REPOS_KEY = 'recent-repos';
export const MAX_RECENT_REPOS = 20;
