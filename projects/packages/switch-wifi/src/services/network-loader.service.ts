import { messageOf } from '../common/error.util';
import type { NetworkIssue } from '../models/network-issue.schema';
import { getSavedNetworks, getWifiDevice, isWifiPowered } from './wifi.service';

interface LoadedNetworks {
  networks: string[];
  issues: NetworkIssue[];
}

/** Never throws, so a broken Wi-Fi setup shows up as a row explaining it rather than as an empty list. */
export async function loadNetworks(): Promise<LoadedNetworks> {
  try {
    const device = await getWifiDevice();
    if (!device) {
      return { networks: [], issues: [{ kind: 'no-wifi-interface' }] };
    }

    if (!(await isWifiPowered(device))) {
      return { networks: [], issues: [{ kind: 'wifi-off', device }] };
    }

    const networks = await getSavedNetworks(device);
    if (!networks.length) {
      return { networks, issues: [{ kind: 'no-saved-networks' }] };
    }

    return { networks, issues: [] };
  } catch (error) {
    return { networks: [], issues: [{ kind: 'networksetup-failed', message: messageOf(error) }] };
  }
}
