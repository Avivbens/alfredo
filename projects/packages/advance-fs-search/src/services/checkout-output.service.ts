import { type AlfredScriptFilter, type IconService, matches } from 'fast-alfred';
import { basename } from 'node:path';
import type { WorktreesRoute } from '../models/routes.model';
import type { Worktree } from '../models/worktree.model';
import { toCheckoutItem } from './file-item.service';
import { getCheckouts } from './worktree.service';

export async function loadCheckoutOutput(
  { state, filter }: WorktreesRoute,
  icons: IconService,
): Promise<AlfredScriptFilter> {
  const checkouts = await getCheckouts(state.repoPath);

  return { items: matches(filter, checkouts, toSearchText).map((checkout) => toCheckoutItem(checkout, icons)) };
}

function toSearchText({ path, branch }: Worktree): string {
  return `${basename(path)} ${branch}`;
}
