import { type AlfredScriptFilter, type IconService, matches } from 'fast-alfred';
import { basename } from 'node:path';
import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import type { WorktreesRoute } from '../models/routes.model';
import { toCheckoutItem } from './file-item.service';

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
