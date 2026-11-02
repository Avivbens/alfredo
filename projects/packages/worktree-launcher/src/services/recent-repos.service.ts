import type { Clone } from '../models/clone.schema';
import type { RecentRepos } from '../models/recent-repos.schema';
import { recentReposSchema } from '../models/recent-repos.schema';
import type { Cache } from './cache.service';

export const RECENT_REPOS_KEY = 'recent-repos';

const MAX_RECENT = 20;

export function sortByRecent(clones: Clone[], recent: RecentRepos): Clone[] {
  const entries = clones.map((clone) => [clone.path, clone] as const);
  const byPath = new Map(entries);
  const recentClones = recent.flatMap((path) => byPath.get(path) ?? []);
  const rest = clones
    .filter(({ path }) => !recent.includes(path))
    .sort((a, b) => a.nameWithOwner.localeCompare(b.nameWithOwner) || a.path.localeCompare(b.path));

  return [...recentClones, ...rest];
}

export function touchRecentRepo(recent: RecentRepos, path: string): RecentRepos {
  const others = recent.filter((entry) => entry !== path);

  return [path, ...others].slice(0, MAX_RECENT);
}

export function loadRecentRepos(cache: Pick<Cache, 'get'>): RecentRepos {
  const stored = cache.get<unknown>(RECENT_REPOS_KEY);
  const parsed = recentReposSchema.safeParse(stored);

  return parsed.data ?? [];
}

/** The cache has no plain `set`, and `setWithTTL` without options never expires. */
export function recordRecentRepo(cache: Cache, path: string): void {
  const recent = loadRecentRepos(cache);
  const updated = touchRecentRepo(recent, path);

  cache.setWithTTL(RECENT_REPOS_KEY, updated);
}
