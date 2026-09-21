import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { BLUEUTIL_INSTALL_COMMAND } from '../config/constants';
import { encodeAction } from '../models/bluetooth-action.model';
import type { BluetoothDevice } from '../models/bluetooth-device.model';
import { BluetoothError, BluetoothFailure } from '../models/bluetooth-failure.model';
import { getPairedDevices, isBluetoothPowered } from '../services/bluetooth.service';
import { orderByPreference } from '../services/device-order.service';

function toDeviceItem({ address, name, connected }: BluetoothDevice): AlfredListItem {
  const primary = `↩ to ${connected ? 'force a reconnect' : 'connect'} and route audio here`;

  return {
    title: name,
    subtitle: `${connected ? 'Connected' : 'Paired'} · ${address} · ${primary}${connected ? ' · ⌘ to disconnect' : ''}`,
    arg: encodeAction({ kind: 'reconnect', address, name }),
    match: `${name} ${address}`,
    mods: {
      cmd: connected
        ? { arg: encodeAction({ kind: 'disconnect', address, name }), subtitle: `Disconnect ${name}` }
        : { arg: '', subtitle: `${name} is not connected`, valid: false },
    },
  };
}

function toFailureItem(alfredClient: FastAlfred, { failure, message }: BluetoothError): AlfredListItem {
  switch (failure) {
    case BluetoothFailure.NOT_INSTALLED:
      return {
        title: '⚠️ blueutil is not installed',
        subtitle: `${BLUEUTIL_INSTALL_COMMAND} (⌘C to copy · ⌘L to view)`,
        valid: false,
        text: { copy: BLUEUTIL_INSTALL_COMMAND, largetype: BLUEUTIL_INSTALL_COMMAND },
        icon: { path: alfredClient.icons.getIcon('error') },
      };

    case BluetoothFailure.NO_ACCESS:
      return {
        title: '⚠️ Alfred is not allowed to use Bluetooth',
        subtitle: '↩ to open Privacy & Security › Bluetooth, then enable Alfred',
        arg: encodeAction({ kind: 'grant-access' }),
        icon: { path: alfredClient.icons.getIcon('locked') },
      };

    case BluetoothFailure.UNAVAILABLE:
      return {
        title: '⚠️ No Bluetooth interface is available',
        subtitle: 'macOS reports no usable Bluetooth hardware on this Mac',
        valid: false,
        icon: { path: alfredClient.icons.getIcon('error') },
      };

    case BluetoothFailure.UNKNOWN:
      return {
        title: '⚠️ blueutil failed',
        subtitle: message,
        valid: false,
        text: { copy: message, largetype: message },
        icon: { path: alfredClient.icons.getIcon('error') },
      };
  }
}

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('toggle-audio-output'));

  try {
    if (!(await isBluetoothPowered())) {
      alfredClient.output({
        items: [
          {
            title: 'Bluetooth is off',
            subtitle: '↩ to turn Bluetooth on',
            arg: encodeAction({ kind: 'power-on' }),
            icon: { path: alfredClient.icons.getIcon('warning') },
          },
        ],
      });
      return;
    }

    const devices = await getPairedDevices();

    /**
     * blueutil exits 0 with an empty list when it cannot reach the Bluetooth
     * API at all, which is indistinguishable from a Mac that has genuinely
     * never paired anything - so the row offers the permission fix either way.
     */
    if (!devices.length) {
      alfredClient.output({
        items: [
          {
            title: 'No paired Bluetooth devices found',
            subtitle: 'Pair a device first - or ↩ to grant Alfred Bluetooth access if you already have',
            arg: encodeAction({ kind: 'grant-access' }),
            icon: { path: alfredClient.icons.getIcon('warning') },
          },
        ],
      });
      return;
    }

    const preferredNames: string[] = alfredClient.env.getEnv(Variables.OUTPUTS_LIST, {
      defaultValue: [],
      parser: (input) =>
        input
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
    });

    const ordered = orderByPreference(devices, preferredNames);
    const matched = alfredClient.inputMatches(ordered, ({ name, address }) => `${name} ${address}`);

    /** Alfred reorders results by its own learning unless told otherwise, which would override the config order. */
    alfredClient.output({ items: matched.map(toDeviceItem), skipknowledge: true });
  } catch (error) {
    if (error instanceof BluetoothError) {
      alfredClient.output({ items: [toFailureItem(alfredClient, error)] });
      return;
    }

    alfredClient.error(error);
  }
})();
