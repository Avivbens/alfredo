import { FastAlfred } from 'fast-alfred';
import { homedir } from 'node:os';
import { z } from 'zod';
import { registerUpdater } from '@alfredo/updater';
import { parsePrRef } from '../common/pr-ref.util';
import { CLONES_CACHE_TTL } from '../config/constants';
import { cloneSchema } from '../models/clone.schema';
import type { LauncherIssue } from '../models/launcher-issue.schema';
import { settingsSchema } from '../models/settings.model';
import { loadCached, toClonesCacheKey } from '../services/cache.service';
import { findClones } from '../services/clone-index.service';
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
    const clonesKey = toClonesCacheKey(settings);
    const [clones, { prs, issues: prIssues }] = await Promise.all([
      loadCached(
        cache,
        clonesKey,
        CLONES_CACHE_TTL,
        z.array(cloneSchema),
        () => findClones(settings.repo_roots, settings.scan_depth),
        (found) => found.length > 0,
      ),
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
