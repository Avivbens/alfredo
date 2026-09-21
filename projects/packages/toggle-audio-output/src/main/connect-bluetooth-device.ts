import { FastAlfred } from 'fast-alfred';
import { BluetoothActionSchema } from '../models/bluetooth-action.model';
import { routeAudioTo } from '../services/audio-connection.service';
import {
  disconnectDevice,
  forceReconnect,
  openBluetoothPrivacySettings,
  powerOnBluetooth,
} from '../services/bluetooth.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const action = BluetoothActionSchema.parse(JSON.parse(alfredClient.input));

    switch (action.kind) {
      case 'reconnect': {
        await forceReconnect(action.address);

        /** Devices with no audio role - a watch, a mouse - simply have nothing to route to. */
        const routedTo = await routeAudioTo(action.address);
        alfredClient.log(`reconnected: ${action.name} | routed audio: ${routedTo ?? 'n/a'}\n`);
        break;
      }

      case 'disconnect':
        await disconnectDevice(action.address);
        alfredClient.log(`disconnected: ${action.name}\n`);
        break;

      case 'power-on':
        await powerOnBluetooth();
        break;

      case 'grant-access':
        await openBluetoothPrivacySettings();
        break;
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
