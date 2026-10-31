import { describe, expect, it } from 'vitest';
import { SettingsSchema } from './settings.schema';

describe('settings.schema', () => {
  describe('SettingsSchema', () => {
    it('should read the profiles, result count and fuzzy slider Alfred passes', () => {
      expect(
        SettingsSchema.parse({ lookfor_profiles: 'Default, Work ,,', slice_amount: '15', fuzzy_threshold: '3' }),
      ).toEqual({
        profiles: ['Default', 'Work'],
        sliceAmount: 15,
        fuzzyThreshold: 0.3,
      });
    });

    it('should fall back to no profiles and the default sliders', () => {
      expect(SettingsSchema.parse({})).toEqual({ profiles: [], sliceAmount: 10, fuzzyThreshold: 0.4 });
    });
  });
});
