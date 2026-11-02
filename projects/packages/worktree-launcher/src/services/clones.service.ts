import { z } from 'zod';
import { CLONES_CACHE_TTL } from '../config/constants';
import { cloneSchema } from '../models/clone.schema';
import type { Clone } from '../models/clone.schema';
import type { Settings } from '../models/settings.model';
import type { Cache } from './cache.service';
import { loadCached, toClonesCacheKey } from './cache.service';
import { findClones } from './clone-index.service';

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
