import { describe, expect, it, vi } from 'vitest';
import type { Clone } from '../models/clone.schema';
import { RECENT_REPOS_KEY, recordRecentRepo, sortByRecent, touchRecentRepo } from './recent-repos.service';

function toClone(path: string): Clone {
  return { path, nameWithOwner: `owner/${path.split('/').pop()}` };
}

describe('recent-repos.service', () => {
  describe('sortByRecent', () => {
    it('should put recent clones first in recent order, then the rest alphabetically', () => {
      const clones = ['/w/zeta', '/w/beta', '/w/alpha', '/w/gamma'].map(toClone);

      expect(sortByRecent(clones, ['/w/gamma', '/w/zeta']).map(({ path }) => path)).toEqual([
        '/w/gamma',
        '/w/zeta',
        '/w/alpha',
        '/w/beta',
      ]);
    });

    it('should ignore recent paths that are no longer clones', () => {
      expect(sortByRecent([toClone('/w/a')], ['/w/gone', '/w/a']).map(({ path }) => path)).toEqual(['/w/a']);
    });

    it('should not change the input', () => {
      const clones = [toClone('/w/b'), toClone('/w/a')];

      sortByRecent(clones, []);

      expect(clones.map(({ path }) => path)).toEqual(['/w/b', '/w/a']);
    });
  });

  describe('touchRecentRepo', () => {
    it('should move the path to the front without duplicating it', () => {
      expect(touchRecentRepo(['/a', '/b', '/c'], '/c')).toEqual(['/c', '/a', '/b']);
    });

    it('should keep at most 20', () => {
      const recent = Array.from({ length: 20 }, (_, index) => `/r${index}`);

      const touched = touchRecentRepo(recent, '/new');

      expect(touched).toHaveLength(20);
      expect(touched[0]).toBe('/new');
      expect(touched).not.toContain('/r19');
    });
  });

  describe('recordRecentRepo', () => {
    it('should store the picked repo at the front', () => {
      const cache = { get: vi.fn().mockReturnValue(['/a']), setWithTTL: vi.fn() };

      recordRecentRepo(cache, '/b');

      expect(cache.get).toHaveBeenCalledWith(RECENT_REPOS_KEY);
      expect(cache.setWithTTL).toHaveBeenCalledWith(RECENT_REPOS_KEY, ['/b', '/a']);
    });

    it('should start fresh when the stored value is not a list of paths', () => {
      const cache = { get: vi.fn().mockReturnValue({ broken: true }), setWithTTL: vi.fn() };

      recordRecentRepo(cache, '/b');

      expect(cache.setWithTTL).toHaveBeenCalledWith(RECENT_REPOS_KEY, ['/b']);
    });
  });
});
