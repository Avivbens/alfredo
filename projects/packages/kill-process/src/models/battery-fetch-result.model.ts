import { z } from 'zod';

export const BatteryFetchResultSchema = z.object({
  success: z.boolean(),
  data: z.map(z.number(), z.number()),
  error: z.string().optional(),
});

export type BatteryFetchResult = z.infer<typeof BatteryFetchResultSchema>;
