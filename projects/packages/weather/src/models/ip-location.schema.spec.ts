import { describe, expect, it } from 'vitest';
import { geoJsSchema, ipWhoIsSchema } from './ip-location.schema';

describe('ip-location.schema', () => {
  describe('geoJsSchema', () => {
    it('should read the coordinates geojs sends as strings', () => {
      expect(geoJsSchema.parse({ city: 'Rishon LeTsiyyon', latitude: '31.96', longitude: '34.80' })).toEqual({
        city: 'Rishon LeTsiyyon',
        latitude: 31.96,
        longitude: 34.8,
      });
    });
  });

  describe('ipWhoIsSchema', () => {
    it('should reject a failed lookup, which ipwho.is sends with HTTP 200', () => {
      expect(ipWhoIsSchema.safeParse({ success: false, message: 'Reserved range' }).success).toBe(false);
    });
  });
});
