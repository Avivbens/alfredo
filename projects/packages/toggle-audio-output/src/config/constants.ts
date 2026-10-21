import { secondsToMilliseconds } from 'date-fns';

export const DEFAULT_OUTPUTS_LIST = ['MacBook Pro Speakers'];

export const BLUEUTIL_INSTALL_COMMAND = 'brew install blueutil';

/**
 * Deep link to the pane that grants Bluetooth access. The workflow cannot raise
 * the permission prompt itself - macOS only asks on behalf of the app owning the
 * process, which is Alfred - so the recovery is to send the user there.
 */
export const BLUETOOTH_PRIVACY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth';

export const DISCONNECT_TIMEOUT_SECONDS = 5;

/**
 * How long to wait for a freshly connected device to surface as a CoreAudio
 * output. Devices with no audio role at all (a watch, a mouse) never will, so
 * running out of attempts is a normal outcome rather than a failure.
 */
export const AUDIO_ROUTE_ATTEMPTS = 8;
export const AUDIO_ROUTE_RETRY_DELAY_MS = secondsToMilliseconds(0.25);

/** mDNSResponder answers from its cache at once, so this only bounds a cold browse. */
export const AIRPLAY_BROWSE_MS = secondsToMilliseconds(0.4);

/**
 * Control Center occasionally tears down its window mid-read, which surfaces as an
 * `Invalid index` AppleScript error. Re-running the whole interaction clears it.
 */
export const AIRPLAY_SELECT_ATTEMPTS = 2;
export const AIRPLAY_SELECT_RETRY_DELAY_MS = secondsToMilliseconds(0.4);

export const SWITCHAUDIO_INSTALL_COMMAND = 'brew install switchaudio-osx';

/** Matched against system_profiler's `device_minorType` (`Headphones`, `Speaker`, ...); watches and iPads carry none. */
export const AUDIO_MINOR_TYPE_PATTERN = /headphone|headset|speaker|audio|hands-?free/i;
