import { z } from 'zod';

export const ghStackFileSchema = z.object({
  schemaVersion: z.literal(1),
  stacks: z.array(
    z.object({
      number: z.number().optional(),
      branches: z.array(
        z.object({
          branch: z.string(),
          pullRequest: z.object({ number: z.number() }).optional(),
        }),
      ),
    }),
  ),
});
export type GhStackFile = z.infer<typeof ghStackFileSchema>;
