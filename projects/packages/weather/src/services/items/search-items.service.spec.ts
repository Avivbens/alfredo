import { RouterService } from 'fast-alfred';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW } from '../../models/open-meteo.mock';
import { ROUTES } from '../../models/routes.model';
import { searchCities } from '../open-meteo/geocoding.service';
import { toMapCache } from '../system/cache.mock';
import { toIssueItem } from './issue-items.service';
import { ICONS } from './items.mock';
import { loadSearchRows } from './search-items.service';

vi.mock('../open-meteo/geocoding.service', () => ({ searchCities: vi.fn() }));

const searchCitiesMock = vi.mocked(searchCities);

const PARIS = { name: 'Paris', admin1: 'Île-de-France', country: 'France', latitude: 48.85, longitude: 2.35 };

function toRouter() {
  return new RouterService(ROUTES, '', undefined);
}

describe('search-items.service', () => {
  beforeEach(() => {
    searchCitiesMock.mockResolvedValue([PARIS]);
  });

  describe('loadSearchRows', () => {
    it('should not search for a single character', async () => {
      const { cache } = toMapCache();

      await expect(loadSearchRows(cache, 'p', toRouter(), ICONS, NOW)).resolves.toEqual({ items: [], failed: false });
      expect(searchCitiesMock).not.toHaveBeenCalled();
    });

    it('should name the region and open the days of the city', async () => {
      const router = toRouter();
      const { cache } = toMapCache();

      const { items } = await loadSearchRows(cache, 'pa', router, ICONS, NOW);

      expect(items[0]).toMatchObject({
        title: 'Paris · Île-de-France, France',
        subtitle: '↩ to see the forecast',
        valid: false,
        autocomplete: '› Paris, France ',
      });
      const next = new RouterService(ROUTES, '› Paris, France', router.toVariables()?.fast_alfred_routes);
      expect(next.match()?.state).toEqual({ name: 'Paris, France', latitude: 48.85, longitude: 2.35 });
    });

    it('should fall back to the bare name for a city without a region', async () => {
      searchCitiesMock.mockResolvedValue([{ name: 'Atlantis', latitude: 1, longitude: 2 }]);
      const { cache } = toMapCache();

      const { items } = await loadSearchRows(cache, 'at', toRouter(), ICONS, NOW);

      expect(items[0]?.title).toBe('Atlantis');
      expect(items[0]?.autocomplete).toBe('› Atlantis ');
    });

    it('should list one row per city found', async () => {
      const { cache } = toMapCache();

      const { items: rows, failed } = await loadSearchRows(cache, 'pa', toRouter(), ICONS, NOW);

      expect(rows.map(({ title }) => title)).toEqual(['Paris · Île-de-France, France']);
      expect(failed).toBe(false);
    });

    it('should show a failed search as one issue row', async () => {
      searchCitiesMock.mockRejectedValue(new Error('fetch failed'));
      const { cache } = toMapCache();

      await expect(loadSearchRows(cache, 'pa', toRouter(), ICONS, NOW)).resolves.toEqual({
        items: [toIssueItem({ kind: 'search-failed', message: 'fetch failed' }, ICONS)],
        failed: true,
      });
    });
  });
});
