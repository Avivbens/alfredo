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
    const output = await loadTabsOutput(await loadChromeTabs(), alfredClient.input, settings);

    alfredClient.output(output);
  } catch (error) {
    alfredClient.error(error);
  }
})();
