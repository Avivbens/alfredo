import type { PullRequest } from '../models/pull-request.schema';

export type PrRef = Pick<PullRequest, 'nameWithOwner' | 'number'>;

const URL_PATTERN = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:\/(?:files|commits))?\/?(?:[#?].*)?$/;
const SHORT_PATTERN = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** Lowercased to match the clone index; only github.com is accepted. */
export function parsePrRef(input: string): PrRef | null {
  const match = URL_PATTERN.exec(input.trim()) ?? SHORT_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }
  const [, owner, repo, number] = match;

  return { nameWithOwner: `${owner}/${repo}`.toLowerCase(), number: Number(number) };
}
