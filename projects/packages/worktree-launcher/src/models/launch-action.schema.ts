import { z } from 'zod';
import { cloneSchema } from './clone.schema';
import { pullRequestSchema } from './pull-request.schema';

export const stackLayerSchema = pullRequestSchema
  .pick({ number: true, headRefName: true, url: true })
  .extend({ position: z.number() });
export type StackLayer = z.infer<typeof stackLayerSchema>;

export const launchActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('pr'),
    pr: pullRequestSchema,
    mode: z.enum(['editor', 'new-session', 'resume-session', 'browser']),
  }),
  z.object({
    kind: z.literal('task'),
    branch: z.string(),
    clone: cloneSchema,
    mode: z.enum(['editor', 'new-session']),
  }),
  z.object({
    kind: z.literal('stack'),
    nameWithOwner: z.string(),
    number: z.number(),
    layers: z.array(stackLayerSchema),
    target: z.number(),
    mode: z.enum(['editor', 'new-session', 'resume-session']),
  }),
]);
export type LaunchAction = z.infer<typeof launchActionSchema>;
export type PrAction = Extract<LaunchAction, { kind: 'pr' }>;
export type TaskAction = Extract<LaunchAction, { kind: 'task' }>;
export type StackAction = Extract<LaunchAction, { kind: 'stack' }>;
