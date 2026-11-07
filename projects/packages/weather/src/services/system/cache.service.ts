import type { FastAlfred } from 'fast-alfred';
import type { z } from 'zod';

export type Cache = Pick<FastAlfred['cache'], 'get' | 'setWithTTL'>;

/**
 * `shouldCache` keeps failures and empty answers out of the cache, so a fix shows on the next run;
 * a stored value that no longer matches the schema counts as a miss.
 */
export async function loadCached<T>(
  cache: Cache,
  key: string,
  maxAge: number,
  schema: z.ZodType<T>,
  load: () => Promise<T>,
  shouldCache: (value: T) => boolean,
): Promise<T> {
  const cached = schema.safeParse(cache.get<unknown>(key));
  if (cached.success) {
    return cached.data;
  }

  const value = await load();
  if (shouldCache(value)) {
    cache.setWithTTL(key, value, { maxAge });
  }

  return value;
}
