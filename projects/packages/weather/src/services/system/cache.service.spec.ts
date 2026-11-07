import { secondsToMilliseconds } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { toMapCache } from './cache.mock';
import { loadCached } from './cache.service';

const MAX_AGE = secondsToMilliseconds(1);
const SCHEMA = z.array(z.string());

describe('cache.service', () => {
  describe('loadCached', () => {
    it('should return the cached value without loading', async () => {
      const { cache } = toMapCache({ k: ['hit'] });
      const load = vi.fn();

      const value = await loadCached(cache, 'k', MAX_AGE, SCHEMA, load, () => true);

      expect(value).toEqual(['hit']);
      expect(load).not.toHaveBeenCalled();
    });

    it('should load and store with the TTL on a miss', async () => {
      const { cache, fake } = toMapCache();

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

    it('should treat a stored value of the wrong shape as a miss', async () => {
      const { cache } = toMapCache({ k: [{ path: '/old' }] });

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

    it('should not store a value the caller rejects', async () => {
      const { cache, fake } = toMapCache();

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
