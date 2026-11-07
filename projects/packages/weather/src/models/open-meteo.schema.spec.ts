import { describe, expect, it } from 'vitest';
import { makeForecast } from './open-meteo.mock';
import { forecastResponseSchema, geocodingResponseSchema } from './open-meteo.schema';

describe('open-meteo.schema', () => {
  describe('forecastResponseSchema', () => {
    it('should read a single place, which comes back as an object, as a list of one', () => {
      expect(forecastResponseSchema.parse(makeForecast())).toHaveLength(1);
    });

    it('should read several places, which come back as an array', () => {
      expect(forecastResponseSchema.parse([makeForecast(), makeForecast()])).toHaveLength(2);
    });

    it('should accept a last day that is all null', () => {
      const forecast = makeForecast();
      const daily: Record<string, unknown[]> = forecast.daily;
      for (const [key, series] of Object.entries(daily)) {
        if (key !== 'time') {
          series[2] = null;
        }
      }

      expect(forecastResponseSchema.parse(forecast)[0]?.daily.temperature_2m_max[2]).toBeNull();
    });

    it('should reject a forecast without its daily block', () => {
      const withoutDaily = { ...makeForecast(), daily: undefined };

      expect(forecastResponseSchema.safeParse(withoutDaily).success).toBe(false);
    });
  });

  describe('geocodingResponseSchema', () => {
    it('should read a response without results as an empty list', () => {
      expect(geocodingResponseSchema.parse({ generationtime_ms: 1 })).toEqual({ results: [] });
    });
  });
});
