import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { isWorktreeQuery } from '../common/worktree-query.util';
import { SettingsSchema } from '../models/settings.model';
import { loadCheckoutOutput } from '../services/checkout-output.service';
import { loadSearchOutput } from '../services/search-output.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('advance-fs-search'));

  try {
    const { input, icons } = alfredClient;
    const settings = alfredClient.env.parse(SettingsSchema);
    const output =
      settings.search.searchWorktrees && isWorktreeQuery(input)
        ? await loadCheckoutOutput(input, settings.worktreeRepos, icons)
        : await loadSearchOutput(input, settings, icons);

    alfredClient.output(output);
  } catch (error) {
    alfredClient.error(error);
  }
})();
