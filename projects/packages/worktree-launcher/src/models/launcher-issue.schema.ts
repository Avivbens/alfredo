import { z } from 'zod';
import { prIssueSchema } from './pull-request.schema';

export const launcherIssueSchema = z.discriminatedUnion('kind', [
  ...prIssueSchema.options,
  z.object({ kind: z.literal('no-clones'), roots: z.array(z.string()), depth: z.number() }),
  z.object({ kind: z.literal('no-prs'), filter: z.string() }),
]);
export type LauncherIssue = z.infer<typeof launcherIssueSchema>;
