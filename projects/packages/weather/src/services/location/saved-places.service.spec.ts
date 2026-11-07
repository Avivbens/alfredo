import { describe, expect, it } from 'vitest';
import { parseSavedPlace } from './saved-places.service';

describe('saved-places.service', () => {
  describe('parseSavedPlace', () => {
    it('should read a plain line as a place name', () => {
      expect(parseSavedPlace('Haifa')).toEqual({ kind: 'name', name: 'Haifa' });
    });

    it('should read a label with coordinates, with or without spaces', () => {
      const office = { kind: 'coordinates', place: { name: 'Office', latitude: 32.08, longitude: 34.78 } };

      expect(parseSavedPlace('Office: 32.08, 34.78')).toEqual(office);
      expect(parseSavedPlace('Office:32.08,34.78')).toEqual(office);
    });

    it('should read negative coordinates', () => {
      expect(parseSavedPlace('Rio: -22.9, -43.2')).toEqual({
        kind: 'coordinates',
        place: { name: 'Rio', latitude: -22.9, longitude: -43.2 },
      });
    });

    it('should read out-of-range coordinates and other colons as a name', () => {
      expect(parseSavedPlace('Pole: 95, 10')).toEqual({ kind: 'name', name: 'Pole: 95, 10' });
      expect(parseSavedPlace('Paris: 12th')).toEqual({ kind: 'name', name: 'Paris: 12th' });
    });
  });
});
