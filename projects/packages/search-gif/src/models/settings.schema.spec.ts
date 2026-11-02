import { describe, expect, it } from 'vitest';
import { settingsSchema } from './settings.schema';

describe('settings.schema', () => {
  describe('settingsSchema', () => {
    it('should read the key, result count and rating Alfred passes', () => {
      expect(settingsSchema.parse({ giphy_api_key: ' beta-key ', results_limit: '35', rating: 'g' })).toEqual({
        apiKey: 'beta-key',
        resultsLimit: 35,
        rating: 'g',
      });
    });

    it('should fall back to no key, 20 results and pg-13', () => {
      expect(settingsSchema.parse({})).toEqual({ apiKey: '', resultsLimit: 20, rating: 'pg-13' });
    });

    it('should reject a rating GIPHY does not know', () => {
      expect(() => settingsSchema.parse({ rating: 'nc-17' })).toThrow();
    });
  });
});
