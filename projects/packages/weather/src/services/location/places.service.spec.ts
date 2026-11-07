import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeSavedName } from '../open-meteo/geocoding.service';
import { toMapCache } from '../system/cache.mock';
import { loadCurrentPlace } from './ip-location.service';
import { type PlaceEntry, filterPlaceEntries, resolvePlaces } from './places.service';

vi.mock('./ip-location.service', () => ({ loadCurrentPlace: vi.fn() }));
vi.mock('../open-meteo/geocoding.service', () => ({ geocodeSavedName: vi.fn() }));

const loadCurrentPlaceMock = vi.mocked(loadCurrentPlace);
const geocodeSavedNameMock = vi.mocked(geocodeSavedName);

const HAIFA = { name: 'Haifa', latitude: 32.81, longitude: 34.99 };

describe('places.service', () => {
  beforeEach(() => {
    loadCurrentPlaceMock.mockResolvedValue({ name: 'Tel-Aviv', latitude: 32.08, longitude: 34.78 });
    geocodeSavedNameMock.mockImplementation(async (_cache, name) => (name === 'Haifa' ? HAIFA : null));
  });

  describe('resolvePlaces', () => {
    it('should list the current location, then each saved line in order', async () => {
      const { cache } = toMapCache();

      const entries = await resolvePlaces(cache, {
        saved_places: ['Haifa', 'Office: 32.08, 34.78', 'Nowhere'],
        show_current_location: true,
      });

      expect(entries).toEqual([
        { kind: 'place', place: { name: '📍 Tel-Aviv', latitude: 32.08, longitude: 34.78, source: 'current' } },
        { kind: 'place', place: { ...HAIFA, source: 'saved' } },
        { kind: 'place', place: { name: 'Office', latitude: 32.08, longitude: 34.78, source: 'saved' } },
        { kind: 'issue', issue: { kind: 'place-not-found', name: 'Nowhere' } },
      ]);
    });

    it('should show an issue in place of an undetected location', async () => {
      loadCurrentPlaceMock.mockResolvedValue(null);
      const { cache } = toMapCache();

      const entries = await resolvePlaces(cache, { saved_places: ['Haifa'], show_current_location: true });

      expect(entries[0]).toEqual({ kind: 'issue', issue: { kind: 'location-unavailable' } });
      expect(entries).toHaveLength(2);
    });

    it('should show an issue for a saved name whose lookup fails', async () => {
      geocodeSavedNameMock.mockRejectedValue(new Error('Open-Meteo answered HTTP 500'));
      const { cache } = toMapCache();

      const entries = await resolvePlaces(cache, { saved_places: ['Haifa'], show_current_location: false });

      expect(entries).toEqual([
        { kind: 'issue', issue: { kind: 'request-failed', name: 'Haifa', message: 'Open-Meteo answered HTTP 500' } },
      ]);
    });

    it('should say there is nothing to show without saved places or the current location', async () => {
      const { cache } = toMapCache();

      const entries = await resolvePlaces(cache, { saved_places: [], show_current_location: false });

      expect(entries).toEqual([{ kind: 'issue', issue: { kind: 'no-places' } }]);
      expect(loadCurrentPlaceMock).not.toHaveBeenCalled();
    });
  });

  describe('filterPlaceEntries', () => {
    const entries: PlaceEntry[] = [
      { kind: 'issue', issue: { kind: 'location-unavailable' } },
      { kind: 'place', place: { ...HAIFA, source: 'saved' } },
      { kind: 'place', place: { name: 'Office', latitude: 1, longitude: 2, source: 'saved' } },
    ];

    it('should keep every entry, issues included, when nothing is typed', () => {
      expect(filterPlaceEntries(entries, '')).toEqual(entries);
    });

    it('should keep only the places whose name matches what is typed', () => {
      expect(filterPlaceEntries(entries, 'HAI')).toEqual([entries[1]]);
    });
  });
});
