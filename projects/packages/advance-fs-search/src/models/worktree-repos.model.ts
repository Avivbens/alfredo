import { z } from 'zod';
import { Variables } from '../common/variables';

/** Maps the repo name shown after `⎇ ` in the query to its path, carried between runs as an Alfred session variable. */
export const WorktreeReposSchema = z.record(z.string(), z.string());
export type WorktreeRepos = z.infer<typeof WorktreeReposSchema>;

export function toWorktreeVariables(repos: WorktreeRepos): Record<string, string> {
  return { [Variables.WORKTREE_REPOS]: JSON.stringify(repos) };
}

export function parseWorktreeRepos(data: string): WorktreeRepos {
  return WorktreeReposSchema.parse(JSON.parse(data));
}
