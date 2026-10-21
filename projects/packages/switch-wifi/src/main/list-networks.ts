import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { toIssueItem } from '../services/issue-item.service';
import { toNetworkItem } from '../services/network-item.service';
import { loadNetworks } from '../services/network-loader.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('switch-wifi'));

  try {
    const { networks, issues } = await loadNetworks();
    const matched = alfredClient.inputMatches(networks, (ssid) => ssid);

    alfredClient.output({
      items: [...matched.map(toNetworkItem), ...issues.map((issue) => toIssueItem(issue, alfredClient.icons))],
    });
  } catch (error) {
    alfredClient.error(error);
  }
})();
