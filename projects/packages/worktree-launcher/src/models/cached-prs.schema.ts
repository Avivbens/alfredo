import { z } from 'zod';
import { prIssueSchema, pullRequestSchema } from './pull-request.schema';

export const cachedPullRequestsSchema = z.object({
  prs: z.array(pullRequestSchema),
  issues: z.array(prIssueSchema),
});
