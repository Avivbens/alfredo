import { secondsToMilliseconds } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { type Cache, loadCached } from './load-cached';

const MAX_AGE = secondsToMilliseconds(1);
const SCHEMA = z.array(z.string());

/** `vi.fn()` cannot express the generic `get<T>`, so the fake is cast once here instead of in every test */
function toCache(stored: unknown) {
  const fake = { get: vi.fn().mockReturnValue(stored), setWithTTL: vi.fn() };

  return { cache: fake as unknown as Cache, fake };
}

describe('load-cached', () => {
  describe('loadCached', () => {
    it('should return the cached value without loading', async () => {
      const { cache } = toCache(['hit']);
      const load = vi.fn();

      const value = await loadCached(cache, 'k', MAX_AGE, SCHEMA, load, () => true);

      expect(value).toEqual(['hit']);
      expect(load).not.toHaveBeenCalled();
    });

    it('should load and store with the TTL on a miss', async () => {
      const { cache, fake } = toCache(null);

      const value = await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => ['fresh'],
        () => true,
      );

      expect(value).toEqual(['fresh']);
      expect(fake.setWithTTL).toHaveBeenCalledWith('k', ['fresh'], { maxAge: MAX_AGE });
    });

    it('should treat a stored value of the wrong shape as a miss, such as one written by an older version', async () => {
      const { cache } = toCache([{ path: '/old' }]);

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

    it('should skip the cached value and store the fresh one when forced', async () => {
      const { cache, fake } = toCache(['hit']);

      const value = await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => ['fresh'],
        () => true,
        { force: true },
      );

      expect(value).toEqual(['fresh']);
      expect(fake.setWithTTL).toHaveBeenCalledWith('k', ['fresh'], { maxAge: MAX_AGE });
    });

    it('should not store a value the predicate rejects, such as a failed load', async () => {
      const { cache, fake } = toCache(null);

      await loadCached(
        cache,
        'k',
        MAX_AGE,
        SCHEMA,
        async () => [],
        (value) => value.length > 0,
      );

      expect(fake.setWithTTL).not.toHaveBeenCalled();
    });
  });
});
