import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const SettingsSchema = z
  .object({
    slice_amount: alfredSchemas.number().default(10),
    fuzzy_threshold: alfredSchemas.number().default(4),
    rerun_interval: alfredSchemas.number().default(1),
    rerun_interval_resources: alfredSchemas.number().default(3),
  })
  .transform((env) => ({
    sliceAmount: env.slice_amount,
    /** The slider runs 0-10, while the fuzzy search takes 0-1. */
    fuzzyThreshold: env.fuzzy_threshold / 10,
    rerunInterval: Math.round(env.rerun_interval),
    rerunIntervalResources: Math.round(env.rerun_interval_resources),
  }));
