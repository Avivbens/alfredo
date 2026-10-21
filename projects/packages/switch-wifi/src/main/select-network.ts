import { FastAlfred } from 'fast-alfred';
import { messageOf } from '../common/error.util';
import { notify } from '../common/notify.util';
import { NetworkActionSchema } from '../models/network-action.schema';
import { joinNetwork } from '../services/control-center.service';
import { setWifiPower } from '../services/wifi.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const action = NetworkActionSchema.parse(JSON.parse(alfredClient.input));

    switch (action.kind) {
      case 'join': {
        const outcome = await joinNetwork(action.ssid);
        notify(outcome === 'already-connected' ? `Already on ${action.ssid}` : `Joining ${action.ssid}`);
        break;
      }

      case 'power-on': {
        await setWifiPower(action.device, 'on');
        notify('Wi-Fi is on');
        break;
      }
    }
  } catch (error) {
    alfredClient.log(messageOf(error));
    notify(`⚠️ ${messageOf(error)}`);
  }
})();
