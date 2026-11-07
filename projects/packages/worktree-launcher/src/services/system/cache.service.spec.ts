import { describe, expect, it } from 'vitest';
import { toClonesCacheKey } from './cache.service';

describe('cache.service', () => {
  describe('toClonesCacheKey', () => {
    it('should change with the roots and the depth', () => {
      const base = { repo_roots: ['/a', '/b'], scan_depth: 3 };

      expect(toClonesCacheKey(base)).toBe('clones:3:/a|/b');
      expect(toClonesCacheKey({ ...base, scan_depth: 4 })).not.toBe(toClonesCacheKey(base));
      expect(toClonesCacheKey({ ...base, repo_roots: ['/a'] })).not.toBe(toClonesCacheKey(base));
    });
  });
});
