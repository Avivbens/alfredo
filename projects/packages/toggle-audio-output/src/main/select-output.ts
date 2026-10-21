import { FastAlfred } from 'fast-alfred';
import { OutputActionSchema } from '../models/output-action.schema';
import { streamToAirPlay } from '../services/airplay.service';
import { routeAudioTo, setAudioOutputByUid } from '../services/audio-connection.service';
import {
  disconnectDevice,
  forceReconnect,
  openBluetoothPrivacySettings,
  powerOnBluetooth,
} from '../services/bluetooth.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const action = OutputActionSchema.parse(JSON.parse(alfredClient.input));

    switch (action.kind) {
      case 'switch': {
        await setAudioOutputByUid(action.uid);
        alfredClient.log(`switched to: ${action.name}\n`);
        break;
      }

      case 'airplay': {
        await streamToAirPlay(action.name);
        alfredClient.log(`airplay: ${action.name}\n`);
        break;
      }

      case 'reconnect': {
        await forceReconnect(action.address);

        /** Devices with no audio role - a watch, a mouse - simply have nothing to route to. */
        const routedTo = await routeAudioTo(action.address);
        alfredClient.log(`reconnected: ${action.name} | routed audio: ${routedTo ?? 'n/a'}\n`);
        break;
      }

      case 'disconnect': {
        await disconnectDevice(action.address);
        alfredClient.log(`disconnected: ${action.name}\n`);
        break;
      }

      case 'power-on': {
        await powerOnBluetooth();
        break;
      }

      case 'grant-access': {
        await openBluetoothPrivacySettings();
        break;
      }
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
