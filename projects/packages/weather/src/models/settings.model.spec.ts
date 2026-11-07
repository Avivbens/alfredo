import { describe, expect, it } from 'vitest';
import { settingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('settingsSchema', () => {
    it('should default to the weather keyword, no saved places and the current location', () => {
      expect(settingsSchema.parse({})).toEqual({
        weather_keyword: 'weather',
        saved_places: [],
        show_current_location: true,
      });
    });

    it('should read saved places as trimmed lines without blanks', () => {
      expect(settingsSchema.parse({ saved_places: 'Haifa\n\n Office: 1, 2 ' }).saved_places).toEqual([
        'Haifa',
        'Office: 1, 2',
      ]);
    });

    it('should read the current location checkbox', () => {
      expect(settingsSchema.parse({ show_current_location: '0' }).show_current_location).toBe(false);
    });
  });
});
