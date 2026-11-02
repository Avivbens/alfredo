import { minutesToMilliseconds } from 'date-fns';

export const CLONES_CACHE_TTL = minutesToMilliseconds(10);

export const PRS_CACHE_KEY = 'prs';
export const PRS_CACHE_TTL = minutesToMilliseconds(1);
