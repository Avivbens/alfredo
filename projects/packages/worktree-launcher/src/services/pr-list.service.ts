import type { Worktree } from '@alfredo/git-worktrees';
import { getCheckouts } from '@alfredo/git-worktrees';
import type { Clone } from '../models/clone.schema';
import type { LocalStack } from '../models/gh-stack-file.schema';
import type { StackAction } from '../models/launch-action.schema';
import type { PullRequest } from '../models/pull-request.schema';
import { readEachClone } from './clones.service';
import { readLocalStacks } from './local-stacks.service';
import type { PrState } from './pr-match.service';
import { loadCheckouts, toPrStates } from './pr-match.service';
import type { StackCheckout } from './rebase-branches.service';
import { loadRebaseBranches } from './rebase-branches.service';
import { pickStackFolder, toLocalStackBranches, toStackPath } from './stack-folder.service';

type PrStack = NonNullable<PullRequest['stack']>;

export type StackedPullRequest = PullRequest & { stack: PrStack };

type StackedState = PrState & { pr: StackedPullRequest };

export type StackGroup = Omit<PrStack, 'position'> &
  Pick<PullRequest, 'nameWithOwner'> & { layers: StackedState[]; clone?: Clone; folder?: Worktree };

export type ListEntry = { kind: 'pr'; state: PrState } | { kind: 'stack'; group: StackGroup };

export type OpenLayers = Map<string, StackedPullRequest[]>;

type FolderSources = {
  clones: Clone[];
  checkouts: Record<string, Worktree[]>;
  localStacks: Record<string, LocalStack[]>;
};

type StackLocation = Pick<StackGroup, 'clone' | 'folder'>;

function isStacked(pr: PullRequest): pr is StackedPullRequest {
  return !!pr.stack;
}

function isStackedState(state: PrState): state is StackedState {
  return isStacked(state.pr);
}

/** Stack numbers repeat across repos, so the repo is part of the key. */
function toStackKey(nameWithOwner: string, stackNumber: number): string {
  return `${nameWithOwner}#${stackNumber}`;
}

function isSameStack(a: StackedPullRequest, b: StackedPullRequest): boolean {
  return a.nameWithOwner === b.nameWithOwner && a.stack.number === b.stack.number;
}

function byPosition(a: StackedPullRequest, b: StackedPullRequest): number {
  return a.stack.position - b.stack.position;
}

/** Typing filters layers out, so a stack's count, folder, fork check and launch layers come from the unfiltered list. */
export function toOpenLayers(prs: PullRequest[]): OpenLayers {
  const stacked = prs.filter(isStacked);
  const unique = stacked.filter(
    (pr, index) =>
      stacked.findIndex((other) => isSameStack(other, pr) && other.stack.position === pr.stack.position) === index,
  );
  const firsts = unique.filter((pr, index) => unique.findIndex((other) => isSameStack(other, pr)) === index);

  const entries = firsts.map((pr) => {
    const key = toStackKey(pr.nameWithOwner, pr.stack.number);
    const layers = unique.filter((other) => isSameStack(other, pr)).toSorted(byPosition);

    return [key, layers] as const;
  });

  return new Map(entries);
}

export function findOpenLayers(openLayers: OpenLayers, group: StackGroup): StackedPullRequest[] {
  const key = toStackKey(group.nameWithOwner, group.number);

  return openLayers.get(key) ?? group.layers.map(({ pr }) => pr);
}

function toStackGroup({ nameWithOwner, stack }: StackedPullRequest, states: StackedState[]): StackGroup {
  const layers = states.toSorted((a, b) => byPosition(a.pr, b.pr));

  return { number: stack.number, size: stack.size, nameWithOwner, layers };
}

/** A fork layer's branch lives outside the repo, so its whole stack keeps today's per-PR rows. */
export function toListEntries(states: PrState[], openLayers: OpenLayers = new Map()): ListEntry[] {
  const stacked = states.filter(isStackedState);

  return states.flatMap((state): ListEntry[] => {
    if (!isStackedState(state)) {
      return [{ kind: 'pr', state }];
    }
    const layers = stacked.filter(({ pr }) => isSameStack(pr, state.pr));
    const group = toStackGroup(state.pr, layers);
    const open = findOpenLayers(openLayers, group);
    if (open.some(({ isCrossRepository }) => isCrossRepository)) {
      return [{ kind: 'pr', state }];
    }
    if (layers[0] !== state) {
      return [];
    }

    return [{ kind: 'stack', group }];
  });
}

/** The folder can sit in any clone of the repo, so the shortest clone holding one wins over the shortest clone. */
function locateStack(
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

async function loadStackCheckouts(clonePath: string): Promise<StackCheckout[]> {
  const checkouts = await getCheckouts(clonePath);

  return loadRebaseBranches(checkouts);
}

/** ↩ has to act in the clone its row showed, so the launch runs the list's own pick over fresh reads. */
export async function loadStackClone(
  stack: Pick<StackAction, 'nameWithOwner' | 'number' | 'layers'>,
  clones: Clone[],
): Promise<Clone | undefined> {
  const repoClones = clones.filter(({ nameWithOwner }) => nameWithOwner === stack.nameWithOwner);
  const [checkouts, localStacks] = await Promise.all([
    readEachClone(repoClones, loadStackCheckouts),
    readEachClone(repoClones, readLocalStacks),
  ]);
  const branches = stack.layers.map(({ headRefName }) => headRefName);

  const location = locateStack(stack, branches, { clones: repoClones, checkouts, localStacks });

  return location.clone;
}

/** Several stacks can share a clone, so each clone's `.git/gh-stack` is read once. */
export async function loadListEntries(
  prs: PullRequest[],
  clones: Clone[],
  openLayers: OpenLayers = toOpenLayers(prs),
): Promise<ListEntry[]> {
  const checkouts = await loadCheckouts(prs, clones);
  const states = toPrStates(prs, clones, checkouts);
  const entries = toListEntries(states, openLayers);
  const repoNames = entries.flatMap((entry) => (entry.kind === 'stack' ? [entry.group.nameWithOwner] : []));
  const repos = new Set(repoNames);
  const stackClones = clones.filter(({ nameWithOwner }) => repos.has(nameWithOwner));
  const [stackCheckouts, localStacks] = await Promise.all([
    readEachClone(stackClones, (path) => loadRebaseBranches(checkouts[path] ?? [])),
    readEachClone(stackClones, readLocalStacks),
  ]);
  const sources: FolderSources = { clones: stackClones, checkouts: stackCheckouts, localStacks };

  return entries.map((entry): ListEntry => {
    if (entry.kind === 'pr') {
      return entry;
    }
    const open = findOpenLayers(openLayers, entry.group);
    const branches = open.map(({ headRefName }) => headRefName);
    const location = locateStack(entry.group, branches, sources);

    return { kind: 'stack', group: { ...entry.group, ...location } };
  });
}
