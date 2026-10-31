import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const SettingsSchema = z
  .object({
    lookfor_profiles: alfredSchemas.list().default([]),
    slice_amount: alfredSchemas.number().default(10),
    fuzzy_threshold: alfredSchemas.number().default(4),
  })
  .transform((env) => ({
    profiles: env.lookfor_profiles,
    sliceAmount: env.slice_amount,
    /** The slider runs 0-10, while the fuzzy search takes 0-1. */
    fuzzyThreshold: env.fuzzy_threshold / 10,
  }));
