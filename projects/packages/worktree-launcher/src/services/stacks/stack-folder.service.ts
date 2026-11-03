import type { Worktree } from '@alfredo/git-worktrees';
import { toWorktreePath } from '../../common/worktree-name.util';
import type { LocalStack } from '../../models/gh-stack-file.schema';
import { readLocalStacks } from './local-stacks.service';

export function toStackPath(clonePath: string, stackNumber: number): string {
  return toWorktreePath(clonePath, `stack-${stackNumber}`);
}

export function toLocalStackBranches(stacks: LocalStack[], branches: string[]): string[] {
  return stacks
    .filter((stack) => stack.branches.some(({ branch }) => branches.includes(branch)))
    .flatMap((stack) => stack.branches.map(({ branch }) => branch));
}

/** A stack's top branch may be local only, so it is not on GitHub yet and only the local file knows it. */
export async function readLocalStackBranches(clonePath: string, branches: string[]): Promise<string[]> {
  const stacks = await readLocalStacks(clonePath);

  return toLocalStackBranches(stacks, branches);
}

/** The main checkout ranks last, since switching it would move the branch under the clone the user works in. */
export function pickStackFolder<T extends Worktree>(
  checkouts: T[],
  stackBranches: string[],
  options: { targetBranch?: string; stackPath: string; clonePath: string },
): T | undefined {
  const inStack = checkouts.filter(({ branch }) => stackBranches.includes(branch));
  const linked = inStack.filter(({ path }) => path !== options.clonePath);

  return (
    inStack.find(({ branch }) => branch === options.targetBranch) ??
    inStack.find(({ path }) => path === options.stackPath) ??
    linked.toSorted((a, b) => a.path.length - b.path.length)[0] ??
    inStack.find(({ path }) => path === options.clonePath)
  );
}
