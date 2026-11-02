import { z } from 'zod';

export const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  isDraft: z.boolean(),
  headRefName: z.string(),
  isCrossRepository: z.boolean(),
  nameWithOwner: z.string(),
  source: z.enum(['mine', 'review', 'assigned', 'lookup']),
});
export type PullRequest = z.infer<typeof pullRequestSchema>;

export const prIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('gh-missing') }),
  z.object({ kind: z.literal('gh-unauthenticated') }),
  z.object({ kind: z.literal('failed'), reason: z.string() }),
]);
export type PrIssue = z.infer<typeof prIssueSchema>;
