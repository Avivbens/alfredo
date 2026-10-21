import type { AlfredListItem, FastAlfred } from 'fast-alfred';
import { BLUEUTIL_INSTALL_COMMAND, SWITCHAUDIO_INSTALL_COMMAND } from '../config/constants';
import { type BluetoothError, BluetoothFailure } from '../models/bluetooth-failure.model';
import { encodeAction } from '../models/output-action.schema';
import type { OutputIssue } from '../models/output-issue.schema';

type Icons = FastAlfred['icons'];

function toBluetoothErrorItem({ failure, message }: BluetoothError, icons: Icons): AlfredListItem {
  switch (failure) {
    case BluetoothFailure.NOT_INSTALLED:
      return {
        title: '⚠️ blueutil is not installed',
        subtitle: `${BLUEUTIL_INSTALL_COMMAND} (⌘C to copy · ⌘L to view)`,
        valid: false,
        text: { copy: BLUEUTIL_INSTALL_COMMAND, largetype: BLUEUTIL_INSTALL_COMMAND },
        icon: { path: icons.getIcon('error') },
      };

    case BluetoothFailure.NO_ACCESS:
      return {
        title: '⚠️ Alfred is not allowed to use Bluetooth',
        subtitle: '↩ to open Privacy & Security › Bluetooth, then enable Alfred',
        arg: encodeAction({ kind: 'grant-access' }),
        icon: { path: icons.getIcon('locked') },
      };

    case BluetoothFailure.UNAVAILABLE:
      return {
        title: '⚠️ No Bluetooth interface is available',
        subtitle: 'macOS reports no usable Bluetooth hardware on this Mac',
        valid: false,
        icon: { path: icons.getIcon('error') },
      };

    case BluetoothFailure.UNKNOWN:
      return {
        title: '⚠️ blueutil failed',
        subtitle: message,
        valid: false,
        text: { copy: message, largetype: message },
        icon: { path: icons.getIcon('error') },
      };
  }
}

export function toIssueItem(issue: OutputIssue, icons: Icons): AlfredListItem {
  switch (issue.kind) {
    case 'switchaudio-failed':
      return {
        title: '⚠️ Could not list the audio outputs - is switchaudio-osx installed?',
        subtitle: `${SWITCHAUDIO_INSTALL_COMMAND} (⌘C to copy · ⌘L to view the error)`,
        valid: false,
        text: { copy: SWITCHAUDIO_INSTALL_COMMAND, largetype: issue.message },
        icon: { path: icons.getIcon('error') },
      };

    case 'bluetooth-error':
      return toBluetoothErrorItem(issue.error, icons);

    case 'bluetooth-off':
      return {
        title: 'Bluetooth is off',
        subtitle: '↩ to turn Bluetooth on',
        arg: encodeAction({ kind: 'power-on' }),
        icon: { path: icons.getIcon('warning') },
      };

    case 'no-paired-devices':
      return {
        title: 'No paired Bluetooth devices found',
        subtitle: 'Pair a device first - or ↩ to grant Alfred Bluetooth access if you already have',
        arg: encodeAction({ kind: 'grant-access' }),
        icon: { path: icons.getIcon('warning') },
      };
  }
}
