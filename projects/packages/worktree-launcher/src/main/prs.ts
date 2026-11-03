import { FastAlfred } from 'fast-alfred';
import { homedir } from 'node:os';
import { registerUpdater } from '@alfredo/updater';
import { parsePrRef } from '../common/pr-ref.util';
import type { LauncherIssue } from '../models/launcher-issue.schema';
import { settingsSchema } from '../models/settings.model';
import { toListItems, toPrListOutput } from '../services/items/pr-items.service';
import { loadPullRequestList } from '../services/pull-requests/pr-search.service';
import { loadClones } from '../services/repos/clones.service';
import { toOpenLayers } from '../services/stacks/stack-groups.util';
import { loadListEntries } from '../services/stacks/stacks.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('worktree-launcher'));

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const { cache, input } = alfredClient;

    const ref = parsePrRef(input);
    const [clones, { all, matched, issues: prIssues }] = await Promise.all([
      loadClones(cache, settings),
      loadPullRequestList({ cache, input, ref }),
    ]);

    const openLayers = toOpenLayers(all);
    const entries = await loadListEntries(matched, clones, openLayers);
    const issues: LauncherIssue[] = [...prIssues];
    if (!clones.length) {
      issues.push({ kind: 'no-clones', roots: settings.repo_roots, depth: settings.scan_depth });
    }

    const items = toListItems(entries, issues, homedir(), openLayers);
    const visible = items.slice(0, settings.slice_amount);
    const output = toPrListOutput(visible);

    alfredClient.output(output);
  } catch (error) {
    alfredClient.error(error);
  }
})();
