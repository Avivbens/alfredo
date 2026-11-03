import { FastAlfred } from 'fast-alfred';
import { launchActionSchema } from '../models/launch-action.schema';
import { settingsSchema } from '../models/settings.model';
import { launch } from '../services/launch/launch.service';
import { recordRecentRepo } from '../services/repos/recent-repos.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const action = launchActionSchema.parse(JSON.parse(alfredClient.input));

    if (action.kind === 'task') {
      recordRecentRepo(alfredClient.cache, action.clone.path);
    }
    const notice = await launch(action, settings);
    if (notice) {
      console.log(notice);
    }
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
  }
})();
