import { FastAlfred } from 'fast-alfred';
import { messageOf } from '../common/error.util';
import { notify } from '../common/notify.util';
import { PowerStateSchema } from '../models/power-state.schema';
import { getWifiDevice, setWifiPower } from '../services/wifi.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const state = PowerStateSchema.parse(alfredClient.input);

    const device = await getWifiDevice();
    if (!device) {
      throw new Error('This Mac has no Wi-Fi interface');
    }

    await setWifiPower(device, state);
    notify(`Wi-Fi is ${state}`);
  } catch (error) {
    alfredClient.log(messageOf(error));
    notify(`⚠️ ${messageOf(error)}`);
  }
})();
