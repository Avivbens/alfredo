import { basename } from 'node:path';
import type { WorktreeRepos } from '../models/worktree-repos.model';
import { WORKTREE_QUERY_PREFIX } from '../services/search.config';
import { stripPrefix } from './text.util';

export interface WorktreeQuery {
  repoPath: string;
  filter: string;
}

type RepoEntry = [key: string, path: string];

export function isWorktreeQuery(input: string): boolean {
  return input.startsWith(WORKTREE_QUERY_PREFIX);
}

/** The trailing space lets the user type a filter straight away. */
export function toWorktreeQuery(repoKey: string): string {
  return `${WORKTREE_QUERY_PREFIX}${repoKey} `;
}

export function parseWorktreeQuery(input: string, repos: WorktreeRepos): WorktreeQuery | null {
  const query = stripPrefix(input, WORKTREE_QUERY_PREFIX);
  const entry = findRepoEntry(query, repos);
  if (!entry) {
    return null;
  }

  const [repoKey, repoPath] = entry;
  return { repoPath, filter: stripPrefix(query, repoKey).trim() };
}

/** The longest key wins, so `app (2)` is not read as `app` filtered by `(2)`. */
function findRepoEntry(query: string, repos: WorktreeRepos): RepoEntry | undefined {
  return Object.entries(repos)
    .filter(([key]) => startsWithKey(query, key))
    .sort(byLongestKey)[0];
}

function startsWithKey(query: string, key: string): boolean {
  return query === key || query.startsWith(`${key} `);
}

function byLongestKey([a]: RepoEntry, [b]: RepoEntry): number {
  return b.length - a.length;
}

/** Keys are what the user sees after `⎇ `, so repos sharing a folder name get a numbered suffix. */
export function toWorktreeRepos(paths: string[]): WorktreeRepos {
  return Object.fromEntries(paths.map((path, i) => [toRepoKey(path, paths.slice(0, i)), path]));
}

function toRepoKey(path: string, earlierPaths: string[]): string {
  const name = basename(path);
  const namesakes = earlierPaths.filter((other) => basename(other) === name).length;

  return namesakes ? `${name} (${namesakes + 1})` : name;
}
