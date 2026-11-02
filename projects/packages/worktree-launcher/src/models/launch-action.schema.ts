import { z } from 'zod';
import { pullRequestSchema } from './pull-request.schema';

export const launchActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('pr'),
    pr: pullRequestSchema,
    mode: z.enum(['editor', 'new-session', 'resume-session', 'browser']),
  }),
]);
export type LaunchAction = z.infer<typeof launchActionSchema>;
export type PrAction = Extract<LaunchAction, { kind: 'pr' }>;
