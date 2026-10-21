import { secondsToMilliseconds } from 'date-fns';

/**
 * Control Center occasionally tears down its window mid-read, which surfaces as an
 * `Invalid index` AppleScript error. Re-running the whole interaction clears it.
 */
export const CONTROL_CENTER_ATTEMPTS = 2;
export const CONTROL_CENTER_RETRY_DELAY_MS = secondsToMilliseconds(0.4);
