import type { Worktree } from '@alfredo/git-worktrees';
import { toWorktreePath } from '../../common/worktree-name.util';
import type { Clone } from '../../models/clone.schema';
import type { LocalStack } from '../../models/gh-stack-file.schema';
import type { StackGroup } from './stack-groups.util';

export function toStackPath(clonePath: string, stackNumber: number): string {
  return toWorktreePath(clonePath, `stack-${stackNumber}`);
}

export function toLocalStackBranches(stacks: LocalStack[], branches: string[]): string[] {
  return stacks
    .filter((stack) => stack.branches.some(({ branch }) => branches.includes(branch)))
    .flatMap((stack) => stack.branches.map(({ branch }) => branch));
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

export type FolderSources = {
  clones: Clone[];
  checkouts: Record<string, Worktree[]>;
  localStacks: Record<string, LocalStack[]>;
};

type StackLocation = Pick<StackGroup, 'clone' | 'folder'>;

/** The folder can sit in any clone of the repo, so the shortest clone holding one wins over the shortest clone. */
export function locateStack(
  { nameWithOwner, number }: Pick<StackGroup, 'nameWithOwner' | 'number'>,
  branches: string[],
  { clones, checkouts, localStacks }: FolderSources,
): StackLocation {
  const candidates = clones
    .filter((clone) => clone.nameWithOwner === nameWithOwner)
    .toSorted((a, b) => a.path.length - b.path.length);
  const found = candidates
    .map((clone) => {
      const localBranches = toLocalStackBranches(localStacks[clone.path] ?? [], branches);
      const stackPath = toStackPath(clone.path, number);
      const folder = pickStackFolder(checkouts[clone.path] ?? [], [...branches, ...localBranches], {
        stackPath,
        clonePath: clone.path,
      });

      return { clone, folder };
    })
    .find((match): match is { clone: Clone; folder: Worktree } => !!match.folder);
  if (found) {
    return found;
  }
  const [shortest] = candidates;

  return shortest ? { clone: shortest } : {};
}
