import { AlternateMode } from '../models/alternate-mode.model';

export const DEFAULT_ALTERNATE_MODE = AlternateMode.ADAPTIVE;

/**
 * Control Center's Sound menu bar item is matched by its accessibility
 * description, which is localized - change this on a non-English macOS.
 */
export const SOUND_MENU_LABEL = 'Sound';

/**
 * Control Center occasionally tears down its window mid-read, which surfaces as an
 * `Invalid index` AppleScript error. Re-running the whole interaction clears it.
 */
export const TOGGLE_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 400;
