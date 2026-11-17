import { hoursToMilliseconds } from 'date-fns';

export const CACHE_CONTACTS_KEY = 'contacts';
export const CACHE_TTL = hoursToMilliseconds(24);
export const DEFAULT_MAX_RESULTS_COUNT = 10;

/** Relative to the workflow folder Alfred runs scripts from, and must match `targetDir` + `assetsDir` in `.fast-alfred.config.cjs` */
export const NATIVE_ADDON_PATH = 'build/Release/contacts.node';
