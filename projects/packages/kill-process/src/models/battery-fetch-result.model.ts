import { z } from 'zod';

export const BatteryFetchResultSchema = z.object({
  success: z.boolean(),
  data: z.map(z.number(), z.number()),
  error: z.string().optional(),
  /**
   * One-time terminal command the user must run to enable passwordless
   * powermetrics. Present only when the failure is due to missing sudo setup.
   */
  setupCommand: z.string().optional(),
});

export type BatteryFetchResult = z.infer<typeof BatteryFetchResultSchema>;
