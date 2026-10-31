import { type AlfredScriptFilter, type IconService, matches } from 'fast-alfred';
import { basename } from 'node:path';
import { parseWorktreeQuery } from '../common/worktree-query.util';
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
  return matches(query.filter, checkouts, toSearchText);
}

function toSearchText({ path, branch }: Worktree): string {
  return `${basename(path)} ${branch}`;
}

export async function loadCheckoutOutput(
  input: string,
  repos: WorktreeRepos,
  icons: IconService,
): Promise<AlfredScriptFilter> {
  const checkouts = await getMatchingCheckouts(input, repos);

  return {
    items: checkouts.map((checkout) => toCheckoutItem(checkout, icons)),
    variables: toWorktreeVariables(repos),
  };
}
