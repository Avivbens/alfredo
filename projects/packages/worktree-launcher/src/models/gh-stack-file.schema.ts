import { z } from 'zod';

const localStackBranchSchema = z.object({
  branch: z.string(),
  pullRequest: z.object({ number: z.number() }).optional(),
});

export const localStackSchema = z.object({
  number: z.number().optional(),
  branches: z.array(localStackBranchSchema),
});
export type LocalStack = z.infer<typeof localStackSchema>;

export const ghStackFileSchema = z.object({
  schemaVersion: z.literal(1),
  stacks: z.array(localStackSchema),
});
