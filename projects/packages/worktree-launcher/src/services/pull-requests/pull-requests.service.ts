import { z } from 'zod';
import type { PrRef } from '../../common/pr-ref.util';
import {
  LOOKUP_QUERY,
  LOOKUP_QUERY_PLAIN,
  PULL_REQUESTS_QUERY,
  PULL_REQUESTS_QUERY_PLAIN,
} from '../../common/pull-requests.query';
import type { PrIssue, PullRequest } from '../../models/pull-request.schema';
import { pullRequestSchema } from '../../models/pull-request.schema';
import { runGh } from '../system/gh.service';
import { resolveTool } from '../system/tools.service';

type PullRequestResult = { prs: PullRequest[]; issues: PrIssue[] };

const ghPullRequestSchema = pullRequestSchema.omit({ nameWithOwner: true, source: true, stack: true });

/** Search nodes that are not pull requests come back as `{}`, so they are skipped rather than failing the load. */
const nodeSchema = ghPullRequestSchema.extend({ repository: z.object({ nameWithOwner: z.string() }) });

const stackFieldsSchema = z.object({
  stackEntry: z.object({ position: z.number() }),
  stack: z.object({
    number: z.number(),
    size: z.number(),
    entries: z.object({
      nodes: z.array(z.object({ position: z.number(), pullRequest: nodeSchema.extend({ state: z.string() }) })),
    }),
  }),
});

const graphqlResponseSchema = z.object({
  data: z.object({
    mine: z.object({ nodes: z.array(z.unknown()) }),
    review: z.object({ nodes: z.array(z.unknown()) }),
    assigned: z.object({ nodes: z.array(z.unknown()) }),
  }),
});

const lookupResponseSchema = z.object({
  data: z.object({ repository: z.object({ pullRequest: nodeSchema.passthrough() }) }),
});

function toIssue(error: unknown): PrIssue {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';
  if (stderr.includes('gh auth login')) {
    return { kind: 'gh-unauthenticated' };
  }

  return { kind: 'failed', reason: stderr || (error instanceof Error ? error.message : String(error)) };
}

function toPullRequest(node: z.infer<typeof nodeSchema>, source: PullRequest['source']): PullRequest {
  const { repository, ...pr } = node;

  return { ...pr, nameWithOwner: repository.nameWithOwner.toLowerCase(), source };
}

function toPullRequests(nodes: unknown[], source: PullRequest['source']): PullRequest[] {
  return nodes.flatMap((node) => {
    const parsed = nodeSchema.safeParse(node);
    if (!parsed.success) {
      return [];
    }
    const pr = toPullRequest(parsed.data, source);
    const stacked = stackFieldsSchema.safeParse(node);
    if (!stacked.success) {
      return [pr];
    }
    const { stackEntry, stack } = stacked.data;
    const { number, size } = stack;
    const layers = stack.entries.nodes
      .filter((entry) => entry.pullRequest.state === 'OPEN' && entry.pullRequest.number !== pr.number)
      .map(({ position, pullRequest }) => {
        const layerNode = nodeSchema.parse(pullRequest);
        const layer = toPullRequest(layerNode, 'stack');

        return { ...layer, stack: { number, size, position } };
      });

    return [{ ...pr, stack: { number, size, position: stackEntry.position } }, ...layers];
  });
}

/** Retries once with the plain query, since a GitHub without stacks rejects the stack fields but still lists PRs. */
async function runWithFallback<T>(request: (plain: boolean) => Promise<T>): Promise<T> {
  try {
    return await request(false);
  } catch (error) {
    const issue = toIssue(error);
    if (issue.kind === 'gh-unauthenticated') {
      throw error;
    }

    return request(true);
  }
}

export async function loadPullRequests(): Promise<PullRequestResult> {
  const gh = await resolveTool('gh');
  if (!gh) {
    return { prs: [], issues: [{ kind: 'gh-missing' }] };
  }
  try {
    const { data } = await runWithFallback(async (plain) => {
      const query = plain ? PULL_REQUESTS_QUERY_PLAIN : PULL_REQUESTS_QUERY;
      const output = await runGh(gh, ['api', 'graphql', '-f', `query=${query}`]);

      return graphqlResponseSchema.parse(JSON.parse(output));
    });
    const mine = toPullRequests(data.mine.nodes, 'mine');
    const review = toPullRequests(data.review.nodes, 'review');
    const assigned = toPullRequests(data.assigned.nodes, 'assigned');

    return { prs: [...mine, ...review, ...assigned], issues: [] };
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
  const [owner = '', name = ''] = ref.nameWithOwner.split('/');
  try {
    const { data } = await runWithFallback(async (plain) => {
      const query = plain ? LOOKUP_QUERY_PLAIN : LOOKUP_QUERY;
      const args = ['api', 'graphql', '-f', `query=${query}`, '-f', `owner=${owner}`, '-f', `name=${name}`];
      const output = await runGh(gh, [...args, '-F', `number=${ref.number}`]);

      return lookupResponseSchema.parse(JSON.parse(output));
    });

    const prs = toPullRequests([data.repository.pullRequest], 'lookup');

    return { prs, issues: [] };
  } catch (error) {
    const issue = toIssue(error);

    return { prs: [], issues: [issue] };
  }
}
