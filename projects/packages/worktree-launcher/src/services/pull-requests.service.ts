import { z } from 'zod';
import type { PrRef } from '../common/pr-ref.util';
import { PULL_REQUESTS_QUERY } from '../common/pull-requests.query';
import type { PrIssue, PullRequest } from '../models/pull-request.schema';
import { pullRequestSchema } from '../models/pull-request.schema';
import { runGh } from './gh.service';
import { resolveTool } from './tools.service';

type PullRequestResult = { prs: PullRequest[]; issues: PrIssue[] };

const ghPullRequestSchema = pullRequestSchema.omit({ nameWithOwner: true, source: true });

/** Search nodes that are not pull requests come back as `{}`, so they are skipped rather than failing the load. */
const nodeSchema = ghPullRequestSchema.extend({ repository: z.object({ nameWithOwner: z.string() }) });

const graphqlResponseSchema = z.object({
  data: z.object({
    mine: z.object({ nodes: z.array(z.unknown()) }),
    review: z.object({ nodes: z.array(z.unknown()) }),
  }),
});

function toIssue(error: unknown): PrIssue {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';
  if (stderr.includes('gh auth login')) {
    return { kind: 'gh-unauthenticated' };
  }

  return { kind: 'failed', reason: stderr || (error instanceof Error ? error.message : String(error)) };
}

function toPullRequests(nodes: unknown[], source: PullRequest['source']): PullRequest[] {
  return nodes.flatMap((node) => {
    const parsed = nodeSchema.safeParse(node);
    if (!parsed.success) {
      return [];
    }
    const { repository, ...pr } = parsed.data;

    return [{ ...pr, nameWithOwner: repository.nameWithOwner.toLowerCase(), source }];
  });
}

export async function loadPullRequests(): Promise<PullRequestResult> {
  const gh = await resolveTool('gh');
  if (!gh) {
    return { prs: [], issues: [{ kind: 'gh-missing' }] };
  }
  try {
    const output = await runGh(gh, ['api', 'graphql', '-f', `query=${PULL_REQUESTS_QUERY}`]);
    const { data } = graphqlResponseSchema.parse(JSON.parse(output));
    const mine = toPullRequests(data.mine.nodes, 'mine');
    const review = toPullRequests(data.review.nodes, 'review');

    return { prs: [...mine, ...review], issues: [] };
  } catch (error) {
    const issue = toIssue(error);

    return { prs: [], issues: [issue] };
  }
}

export async function lookupPullRequest(ref: PrRef): Promise<PullRequestResult> {
  const gh = await resolveTool('gh');
  if (!gh) {
    return { prs: [], issues: [{ kind: 'gh-missing' }] };
  }
  try {
    const args = [
      'pr',
      'view',
      String(ref.number),
      '--repo',
      ref.nameWithOwner,
      '--json',
      'number,title,url,isDraft,headRefName,isCrossRepository',
    ];
    const output = await runGh(gh, args);
    const pr = ghPullRequestSchema.parse(JSON.parse(output));

    return { prs: [{ ...pr, nameWithOwner: ref.nameWithOwner.toLowerCase(), source: 'lookup' }], issues: [] };
  } catch (error) {
    const issue = toIssue(error);

    return { prs: [], issues: [issue] };
  }
}
