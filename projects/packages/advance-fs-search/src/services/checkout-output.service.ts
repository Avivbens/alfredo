import type { AlfredScriptFilter } from 'fast-alfred';
import { matchesFilter, parseWorktreeQuery } from '../common/worktree-query.util';
import type { AlfredIcons } from '../models/alfred.model';
import { type WorktreeRepos, toWorktreeVariables } from '../models/worktree-repos.model';
import type { Worktree } from '../models/worktree.model';
import { toCheckoutItem } from './file-item.service';
import { getCheckouts } from './worktree.service';

async function getMatchingCheckouts(input: string, repos: WorktreeRepos): Promise<Worktree[]> {
  const query = parseWorktreeQuery(input, repos);
  if (!query) {
    return [];
  }

  const checkouts = await getCheckouts(query.repoPath);
  return checkouts.filter((checkout) => matchesFilter(checkout, query.filter));
}

export async function loadCheckoutOutput(
  input: string,
  repos: WorktreeRepos,
  icons: AlfredIcons,
): Promise<AlfredScriptFilter> {
  const checkouts = await getMatchingCheckouts(input, repos);

  return {
    items: checkouts.map((checkout) => toCheckoutItem(checkout, icons)),
    variables: toWorktreeVariables(repos),
  };
}
