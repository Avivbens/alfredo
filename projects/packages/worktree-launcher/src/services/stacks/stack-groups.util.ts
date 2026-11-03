import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import type { PrState } from '../pull-requests/pr-match.util';

type PrStack = NonNullable<PullRequest['stack']>;

export type StackedPullRequest = PullRequest & { stack: PrStack };

type StackedState = PrState & { pr: StackedPullRequest };

export type StackGroup = Omit<PrStack, 'position'> &
  Pick<PullRequest, 'nameWithOwner'> & { layers: StackedState[]; clone?: Clone; folder?: Worktree };

export type ListEntry = { kind: 'pr'; state: PrState } | { kind: 'stack'; group: StackGroup };

export type OpenLayers = Map<string, StackedPullRequest[]>;

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
