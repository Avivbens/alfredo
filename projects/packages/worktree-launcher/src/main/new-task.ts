import { FastAlfred, matches } from 'fast-alfred';
import { homedir } from 'node:os';
import { registerUpdater } from '@alfredo/updater';
import { ROUTES } from '../models/routes.model';
import { settingsSchema } from '../models/settings.model';
import { toListItems } from '../services/items/pr-items.service';
import { toRepoItems, toTaskItems } from '../services/items/task-items.service';
import { loadClones } from '../services/repos/clones.service';
import { loadRecentRepos, sortByRecent } from '../services/repos/recent-repos.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('worktree-launcher'));

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const { cache, input } = alfredClient;
    const router = alfredClient.router(ROUTES);
    const route = router.match();

    switch (route?.name) {
      case 'pick-repo': {
        const clones = await loadClones(cache, settings);
        if (!clones.length) {
          const issues = [{ kind: 'no-clones' as const, roots: settings.repo_roots, depth: settings.scan_depth }];
          const issueItems = toListItems([], issues, homedir());
          alfredClient.output({ items: issueItems });
          break;
        }

        const recent = loadRecentRepos(cache);
        const sorted = sortByRecent(clones, recent);
        const filtered = matches(route.filter, sorted, ({ nameWithOwner, path }) => `${nameWithOwner} ${path}`);
        const items = toRepoItems(filtered, route.state.branch, homedir(), route.filter);

        const visible = items.slice(0, settings.slice_amount);

        alfredClient.output({ items: visible });
        break;
      }

      default: {
        const items = toTaskItems(input, router, settings.new_task_keyword);
        alfredClient.output({ items });
      }
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
