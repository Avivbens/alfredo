import { getCheckouts } from '@alfredo/git-worktrees';
import type { Clone } from '../../models/clone.schema';
import type { StackAction } from '../../models/launch-action.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import { loadCheckouts } from '../pull-requests/pr-match.service';
import { toPrStates } from '../pull-requests/pr-match.util';
import { readEachClone } from '../repos/clones.service';
import { readLocalStacks } from './local-stacks.service';
import type { StackCheckout } from './rebase-branches.service';
import { loadRebaseBranches } from './rebase-branches.service';
import type { FolderSources } from './stack-folder.util';
import { locateStack, toLocalStackBranches } from './stack-folder.util';
import type { ListEntry, OpenLayers } from './stack-groups.util';
import { findOpenLayers, toListEntries, toOpenLayers } from './stack-groups.util';

/** A stack's top branch may be local only, so it is not on GitHub yet and only the local file knows it. */
export async function readLocalStackBranches(clonePath: string, branches: string[]): Promise<string[]> {
  const stacks = await readLocalStacks(clonePath);

  return toLocalStackBranches(stacks, branches);
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
