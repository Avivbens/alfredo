import { basename, dirname, join } from 'node:path';
import type { PullRequest } from '../models/pull-request.schema';

const BRANCH_PREFIX = /^(?:feat|fix|migration)\//;
const MAX_ATTEMPTS = 100;

export function toWorktreeName(branch: string): string {
  return branch.replace(BRANCH_PREFIX, '').replaceAll('/', '-');
}

/** A fork's head ref can collide with a local branch, so fork PRs get a neutral local name. */
export function toLocalBranch(pr: PullRequest): string {
  return pr.isCrossRepository ? `pr-${pr.number}` : pr.headRefName;
}

export function toWorktreePath(clonePath: string, name: string): string {
  return join(dirname(clonePath), `${basename(clonePath)}@${name}`);
}

/** Capped so a misbehaving `isTaken` cannot spin forever. */
export async function pickFreePath(base: string, isTaken: (path: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const taken = await isTaken(candidate);
    if (!taken) {
      return candidate;
    }
  }

  throw new Error(`No free folder found for ${base} after ${MAX_ATTEMPTS} attempts`);
}
