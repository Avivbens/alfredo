import { secondsToMilliseconds } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { loadCached, toClonesCacheKey } from './cache.service';

const MAX_AGE = secondsToMilliseconds(1);
const SCHEMA = z.array(z.string());

/** `vi.fn()` cannot express the generic `get<T>`, so the fake is cast once here instead of in every test. */
function toCache(stored: unknown): Parameters<typeof loadCached>[0] {
  const fake = { get: vi.fn().mockReturnValue(stored), setWithTTL: vi.fn() };

  return fake as unknown as Parameters<typeof loadCached>[0];
}

describe('cache.service', () => {
  describe('toClonesCacheKey', () => {
    it('should change with the roots and the depth', () => {
      const base = { repo_roots: ['/a', '/b'], scan_depth: 3 };

      expect(toClonesCacheKey(base)).toBe('clones:3:/a|/b');
      expect(toClonesCacheKey({ ...base, scan_depth: 4 })).not.toBe(toClonesCacheKey(base));
      expect(toClonesCacheKey({ ...base, repo_roots: ['/a'] })).not.toBe(toClonesCacheKey(base));
    });
  });

  describe('loadCached', () => {
    it('should return the cached value without loading', async () => {
      const cache = toCache(['hit']);
      const load = vi.fn();

      const value = await loadCached(cache, 'k', MAX_AGE, SCHEMA, load, () => true);

      expect(value).toEqual(['hit']);
      expect(load).not.toHaveBeenCalled();
    });

    it('should load and store with the TTL on a miss', async () => {
      const cache = toCache(null);

      const value = await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => ['fresh'],
        () => true,
      );

      expect(value).toEqual(['fresh']);
      expect(cache.setWithTTL).toHaveBeenCalledWith('k', ['fresh'], { maxAge: MAX_AGE });
    });

    it('should treat a stored value of the wrong shape as a miss, such as one written by an older version', async () => {
      const cache = toCache([{ path: '/old' }]);

      const value = await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => ['fresh'],
        () => true,
      );

      expect(value).toEqual(['fresh']);
    });

    it('should not store a value the predicate rejects, such as a failed load', async () => {
      const cache = toCache(null);

      await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => [],
        (value) => value.length > 0,
      );

      expect(cache.setWithTTL).not.toHaveBeenCalled();
    });
  });
});
