import { describe, expect, it } from 'vitest';
import { SettingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('SettingsSchema', () => {
    it('should read the sliders Alfred passes', () => {
      expect(
        SettingsSchema.parse({
          slice_amount: '20',
          fuzzy_threshold: '6',
          rerun_interval: '1.6',
          rerun_interval_resources: '3',
        }),
      ).toEqual({ sliceAmount: 20, fuzzyThreshold: 0.6, rerunInterval: 2, rerunIntervalResources: 3 });
    });

    it("should fall back to the plist's slider defaults", () => {
      expect(SettingsSchema.parse({})).toEqual({
        sliceAmount: 10,
        fuzzyThreshold: 0.4,
        rerunInterval: 1,
        rerunIntervalResources: 3,
      });
    });
  });
});
