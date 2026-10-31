import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { DEFAULT_MAX_RESULTS_COUNT } from '../common/constants';
import { CountryCodeSchema } from './country-code.model';

export const SettingsSchema = z
  .object({
    country_code: CountryCodeSchema.default('US'),
    slice_amount: alfredSchemas.number().default(DEFAULT_MAX_RESULTS_COUNT),
    fuzzy_threshold: alfredSchemas.number().default(4),
  })
  .transform((env) => ({
    countryCode: env.country_code,
    sliceAmount: env.slice_amount,
    /** The slider runs 0-10, while the fuzzy search takes 0-1. */
    fuzzyThreshold: env.fuzzy_threshold / 10,
  }));
