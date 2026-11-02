import { FastAlfred } from 'fast-alfred';
import { homedir } from 'node:os';
import { registerUpdater } from '@alfredo/updater';
import { parsePrRef } from '../common/pr-ref.util';
import type { LauncherIssue } from '../models/launcher-issue.schema';
import { settingsSchema } from '../models/settings.model';
import { loadClones } from '../services/clones.service';
import { toPrItems } from '../services/pr-items.service';
import { loadPrStates } from '../services/pr-match.service';
import { loadMatchingPullRequests } from '../services/pr-search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('worktree-launcher'));

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const { cache, input } = alfredClient;

    const ref = parsePrRef(input);
    const [clones, { prs, issues: prIssues }] = await Promise.all([
      loadClones(cache, settings),
      loadMatchingPullRequests(cache, input, ref),
    ]);

    const states = await loadPrStates(prs, clones);
    const issues: LauncherIssue[] = [...prIssues];
    if (!clones.length) {
      issues.push({ kind: 'no-clones', roots: settings.repo_roots, depth: settings.scan_depth });
    }

    const items = toPrItems(states, issues, homedir());
    const visible = items.slice(0, settings.slice_amount);

    alfredClient.output({ items: visible });
  } catch (error) {
    alfredClient.error(error);
  }
})();
