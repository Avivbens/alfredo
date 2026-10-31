import { hoursToMilliseconds } from 'date-fns';

export const CACHE_CONTACTS_KEY = 'contacts';
export const CACHE_TTL = hoursToMilliseconds(24);
export const DEFAULT_MAX_RESULTS_COUNT = 10;
