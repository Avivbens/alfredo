import { z } from 'zod';
import { CLONES_CACHE_TTL } from '../../config/constants';
import { cloneSchema } from '../../models/clone.schema';
import type { Clone } from '../../models/clone.schema';
import type { Settings } from '../../models/settings.model';
import type { Cache } from '../system/cache.service';
import { loadCached, toClonesCacheKey } from '../system/cache.service';
import { findClones } from './clone-index.service';

export async function readEachClone<T>(
  clones: Clone[],
  read: (path: string) => Promise<T>,
): Promise<Record<string, T>> {
  const entries = await Promise.all(
    clones.map(async ({ path }) => {
      const value = await read(path);

      return [path, value] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export function loadClones(cache: Cache, settings: Settings): Promise<Clone[]> {
  const key = toClonesCacheKey(settings);

  return loadCached(
    cache,
    key,
    CLONES_CACHE_TTL,
    z.array(cloneSchema),
    () => findClones(settings.repo_roots, settings.scan_depth),
    (found) => found.length > 0,
  );
}
