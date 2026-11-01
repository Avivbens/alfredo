import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { DEFAULT_RESULTS_LIMIT } from '../config/constants';

export const RatingSchema = z.enum(['g', 'pg', 'pg-13', 'r']);

export const SettingsSchema = z
  .object({
    giphy_api_key: z.string().trim().default(''),
    results_limit: alfredSchemas.number().default(DEFAULT_RESULTS_LIMIT),
    rating: RatingSchema.default('pg-13'),
  })
  .transform((env) => ({
    apiKey: env.giphy_api_key,
    resultsLimit: env.results_limit,
    rating: env.rating,
  }));

export type Settings = z.infer<typeof SettingsSchema>;
