import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { ROUTES } from '../models/routes.model';
import { SettingsSchema } from '../models/settings.model';
import { loadCheckoutOutput } from '../services/checkout-output.service';
import { loadSearchOutput } from '../services/search-output.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('advance-fs-search'));

  try {
    const { input, icons } = alfredClient;
    const settings = alfredClient.env.parse(SettingsSchema);
    const router = alfredClient.router(ROUTES);
    const route = router.match();

    switch (route?.name) {
      case 'worktrees': {
        alfredClient.output(await loadCheckoutOutput(route, icons));
        break;
      }

      default: {
        alfredClient.output(await loadSearchOutput(input, settings, icons, router));
      }
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
