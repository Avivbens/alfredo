import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { SettingsSchema } from '../models/settings.schema';
import { loadChromeTabs } from '../services/chrome-tabs.service';
import { loadTabsOutput } from '../services/tabs-items.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('search-bookmark'));

  const settings = alfredClient.env.parse(SettingsSchema);

  try {
    /** Reading the selection costs a second osascript, and only the rows shown before a query use it. */
    const withSelection = !alfredClient.input.trim();
    const tabs = await loadChromeTabs({ withSelection });
    if (tabs.debugLogs.length) {
      alfredClient.log(tabs.debugLogs.join('\n'));
    }

    const output = await loadTabsOutput(tabs, alfredClient.input, settings);

    alfredClient.output(output);
  } catch (error) {
    alfredClient.error(error);
  }
})();
