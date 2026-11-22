import { z } from 'zod';

export const copyOptionsSchema = z.object({
  /** Marks the copy concealed and transient, so clipboard managers, Alfred's history included, don't record it */
  sensitive: z.boolean().optional(),
});

export type CopyOptions = z.infer<typeof copyOptionsSchema>;
