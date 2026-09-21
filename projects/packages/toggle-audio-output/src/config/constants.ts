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
export const AUDIO_ROUTE_RETRY_DELAY_MS = 250;
