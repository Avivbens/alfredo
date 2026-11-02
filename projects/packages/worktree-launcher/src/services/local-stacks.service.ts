import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GhStackFile } from '../models/gh-stack-file.schema';
import { ghStackFileSchema } from '../models/gh-stack-file.schema';

export type LocalStack = {
  number?: GhStackFile['stacks'][number]['number'];
  branches: { branch: string; prNumber?: number }[];
};

/** `gh stack` keeps unpushed stacks only here, so a missing, unreadable or newer-format file means no local stacks, not an error. */
export async function readLocalStacks(repoPath: string): Promise<LocalStack[]> {
  try {
    const content = await readFile(join(repoPath, '.git', 'gh-stack'), 'utf8');
    const file = ghStackFileSchema.parse(JSON.parse(content));

    return file.stacks.map(({ number, branches }) => ({
      number,
      branches: branches.map(({ branch, pullRequest }) => ({ branch, prNumber: pullRequest?.number })),
    }));
  } catch {
    return [];
  }
}
