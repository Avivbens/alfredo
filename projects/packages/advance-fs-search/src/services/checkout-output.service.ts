import { type AlfredScriptFilter, type IconService, matches } from 'fast-alfred';
import { basename } from 'node:path';
import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import type { WorktreesRoute } from '../models/routes.model';
import { isDirty } from './dirty.service';
import { toCheckoutItem } from './file-item.service';

export async function loadCheckoutOutput(
  { state, filter }: WorktreesRoute,
  icons: IconService,
): Promise<AlfredScriptFilter> {
  const checkouts = await getCheckouts(state.repoPath);

  const items = await Promise.all(
    matches(filter, checkouts, toSearchText).map(async (checkout) =>
      toCheckoutItem(checkout, icons, { dirty: await isDirty(checkout.path) }),
    ),
  );

  return { items };
}

function toSearchText({ path, branch }: Worktree): string {
  return `${basename(path)} ${branch}`;
}
