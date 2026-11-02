import { describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../models/clone.schema';
import type { StackAction } from '../models/launch-action.schema';
import type { PullRequest } from '../models/pull-request.schema';
import type { ListEntry } from './pr-list.service';
import { loadListEntries, loadStackClone, toListEntries, toOpenLayers } from './pr-list.service';
import type { PrState } from './pr-match.service';

const { getCheckouts, readLocalStacks, loadRebaseBranches } = vi.hoisted(() => ({
  getCheckouts: vi.fn(),
  readLocalStacks: vi.fn(),
  loadRebaseBranches: vi.fn(async (checkouts: Worktree[]) => checkouts),
}));

vi.mock('@alfredo/git-worktrees', () => ({ getCheckouts }));
vi.mock('./local-stacks.service', () => ({ readLocalStacks }));
vi.mock('./rebase-branches.service', () => ({ loadRebaseBranches }));

const CLONE: Clone = { path: '/work/alfredo', nameWithOwner: 'avivbens/alfredo' };
const ARCHIVE: Clone = { path: '/work/archive/alfredo', nameWithOwner: 'avivbens/alfredo' };

const STACK_68 = [67, 58, 59];
const MID_REBASE: Worktree = { path: '/work/archive/alfredo@stack-68', branch: 'a1b2c3d' };

function toPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 10,
    title: 'Agenda view',
    url: 'https://github.com/avivbens/alfredo/pull/10',
    isDraft: false,
    headRefName: 'feat/agenda-view',
    isCrossRepository: false,
    nameWithOwner: 'avivbens/alfredo',
    source: 'mine',
    ...overrides,
  };
}

function toLayer(position: number, overrides: Partial<PullRequest> = {}): PullRequest {
  const number = overrides.number ?? STACK_68[position - 1] ?? position;

  return toPr({
    number,
    title: `Layer ${position}`,
    url: `https://github.com/avivbens/alfredo/pull/${number}`,
    headRefName: `feat/layer-${position}`,
    source: 'stack',
    stack: { number: 68, size: STACK_68.length, position },
    ...overrides,
  });
}

function toStackAction(...positions: number[]): Pick<StackAction, 'nameWithOwner' | 'number' | 'layers'> {
  return {
    nameWithOwner: 'avivbens/alfredo',
    number: 68,
    layers: positions.map((position) => {
      const { number, headRefName, url } = toLayer(position);

      return { number, headRefName, url, position };
    }),
  };
}

function mockCheckouts(...folders: Worktree[]): void {
  getCheckouts.mockImplementation(async (path: string) => [
    { path, branch: 'master' },
    ...folders.filter((folder) => folder.path.startsWith(`${path}@`)),
  ]);
}

/** Reports the stack folder mid-rebase as on the branch being rebased, as the rebase helper does. */
function mockRebasing(branch: string): void {
  loadRebaseBranches.mockImplementation(async (checkouts: Worktree[]) =>
    checkouts.map((checkout) =>
      checkout.path === MID_REBASE.path ? { ...checkout, branch, isRebasing: true } : checkout,
    ),
  );
}

function toSummary(entries: ListEntry[]): (number | number[])[] {
  return entries.map((entry) =>
    entry.kind === 'pr' ? entry.state.pr.number : entry.group.layers.map(({ pr }) => pr.number),
  );
}

describe('pr-list.service', () => {
  describe('toListEntries', () => {
    it("should group a stack's layers bottom to top, where its first layer appeared", () => {
      const states: PrState[] = [
        { pr: toPr({ number: 1 }) },
        { pr: toLayer(3) },
        { pr: toPr({ number: 2 }) },
        { pr: toLayer(1) },
        { pr: toLayer(2) },
      ];

      const entries = toListEntries(states);

      expect(toSummary(entries)).toEqual([1, [67, 58, 59], 2]);
      expect(entries[1]).toEqual({
        kind: 'stack',
        group: { number: 68, size: 3, nameWithOwner: 'avivbens/alfredo', layers: [states[3], states[4], states[1]] },
      });
    });

    it('should keep stacks of other numbers and other repos apart', () => {
      const states: PrState[] = [
        { pr: toLayer(1) },
        { pr: toLayer(1, { number: 70, stack: { number: 70, size: 1, position: 1 } }) },
        { pr: toLayer(1, { number: 5, nameWithOwner: 'avivbens/other' }) },
        { pr: toLayer(2) },
      ];

      expect(toSummary(toListEntries(states))).toEqual([[67, 58], [70], [5]]);
    });

    it('should keep a stack with one open layer as a group, so its label stays while the stack drains', () => {
      const [entry] = toListEntries([{ pr: toLayer(3) }]);

      expect(entry).toMatchObject({ kind: 'stack', group: { number: 68, size: 3 } });
    });

    it('should list a stack with a fork layer as plain rows, in place', () => {
      const states: PrState[] = [
        { pr: toLayer(2) },
        { pr: toPr({ number: 1 }) },
        { pr: toLayer(1, { isCrossRepository: true }) },
      ];

      expect(toListEntries(states)).toEqual(states.map((state) => ({ kind: 'pr', state })));
    });

    it('should list a stack as plain rows when typing hid its fork layer', () => {
      const states: PrState[] = [{ pr: toLayer(2) }];
      const openLayers = toOpenLayers([toLayer(1, { isCrossRepository: true }), toLayer(2)]);

      expect(toListEntries(states, openLayers)).toEqual([{ kind: 'pr', state: states[0] }]);
    });
  });

  describe('toOpenLayers', () => {
    it('should keep one entry per open position, bottom to top, keyed by repo and stack number', () => {
      const openLayers = toOpenLayers([toPr(), toLayer(2, { source: 'mine' }), toLayer(3), toLayer(1), toLayer(2)]);

      expect([...openLayers.keys()]).toEqual(['avivbens/alfredo#68']);
      expect(openLayers.get('avivbens/alfredo#68')?.map(({ number }) => number)).toEqual([67, 58, 59]);
    });
  });

  describe('loadListEntries', () => {
    it("should take the longer clone holding the stack's folder, even when typing hid the layer it is on", async () => {
      const folder: Worktree = { path: `${ARCHIVE.path}@stack-68`, branch: 'feat/layer-3' };
      mockCheckouts(folder);
      readLocalStacks.mockResolvedValue([]);
      const openLayers = toOpenLayers([toLayer(1), toLayer(2), toLayer(3)]);

      const [entry] = await loadListEntries([toLayer(1)], [CLONE, ARCHIVE], openLayers);

      expect(entry).toMatchObject({
        kind: 'stack',
        group: { layers: [{ pr: toLayer(1) }], clone: ARCHIVE, folder },
      });
    });

    it('should take the longer clone whose folder is on a local-only gh stack branch', async () => {
      const folder: Worktree = { path: `${ARCHIVE.path}@worktree-flow`, branch: 'feat/layer-4-local' };
      const localStack = {
        branches: [...[1, 2, 3].map((position) => ({ branch: `feat/layer-${position}` })), { branch: folder.branch }],
      };
      mockCheckouts(folder);
      readLocalStacks.mockImplementation(async (path: string) => (path === ARCHIVE.path ? [localStack] : []));

      const [entry] = await loadListEntries([toLayer(1), toLayer(2), toLayer(3)], [CLONE, ARCHIVE]);

      expect(entry).toMatchObject({ kind: 'stack', group: { clone: ARCHIVE, folder } });
    });

    it('should fall back to the shortest clone, with no folder, when no clone holds a stack branch', async () => {
      mockCheckouts();
      readLocalStacks.mockResolvedValue([]);

      const [entry] = await loadListEntries([toLayer(1)], [ARCHIVE, CLONE]);

      expect(entry).toMatchObject({ kind: 'stack', group: { clone: CLONE } });
      expect(entry?.kind === 'stack' && entry.group).not.toHaveProperty('folder');
    });

    it('should find the stack folder in the longer clone while it is mid-rebase', async () => {
      mockCheckouts(MID_REBASE);
      readLocalStacks.mockResolvedValue([]);
      mockRebasing('feat/layer-2');

      const [entry] = await loadListEntries([toLayer(1), toLayer(2)], [CLONE, ARCHIVE]);

      expect(entry).toMatchObject({
        kind: 'stack',
        group: { clone: ARCHIVE, folder: { path: MID_REBASE.path, branch: 'feat/layer-2' } },
      });
    });

    it('should give the group a linked worktree in the stack rather than the main checkout', async () => {
      const linked: Worktree = { path: `${CLONE.path}@worktree-flow`, branch: 'feat/layer-2' };
      getCheckouts.mockResolvedValue([{ path: CLONE.path, branch: 'feat/layer-1' }, linked]);
      readLocalStacks.mockResolvedValue([]);

      const [entry] = await loadListEntries([toLayer(1), toLayer(2)], [CLONE]);

      expect(entry).toMatchObject({ kind: 'stack', group: { clone: CLONE, folder: linked } });
    });

    it("should read each clone's stack file once, however many of its stacks are listed", async () => {
      const other = toLayer(1, { number: 70, headRefName: 'feat/other', stack: { number: 70, size: 1, position: 1 } });
      mockCheckouts();
      readLocalStacks.mockResolvedValue([]);

      const entries = await loadListEntries([toLayer(1), other], [CLONE]);

      expect(entries).toHaveLength(2);
      expect(readLocalStacks).toHaveBeenCalledTimes(1);
      expect(readLocalStacks).toHaveBeenCalledWith(CLONE.path);
    });

    it('should leave the folder empty and skip the stack file when there is no clone', async () => {
      const entries = await loadListEntries([toPr({ number: 1 }), toLayer(1)], []);

      expect(readLocalStacks).not.toHaveBeenCalled();
      expect(entries).toEqual([
        { kind: 'pr', state: { pr: toPr({ number: 1 }) } },
        {
          kind: 'stack',
          group: { number: 68, size: 3, nameWithOwner: 'avivbens/alfredo', layers: [{ pr: toLayer(1) }] },
        },
      ]);
    });
  });

  describe('loadStackClone', () => {
    it("should take the longer clone holding the stack's folder, as the list does", async () => {
      mockCheckouts({ path: `${ARCHIVE.path}@stack-68`, branch: 'feat/layer-3' });
      readLocalStacks.mockResolvedValue([]);
      const other: Clone = { path: '/w/other', nameWithOwner: 'avivbens/other' };

      expect(await loadStackClone(toStackAction(1, 2, 3), [other, CLONE, ARCHIVE])).toEqual(ARCHIVE);
      expect(getCheckouts).not.toHaveBeenCalledWith(other.path);
    });

    it('should take the longer clone whose folder is on a local-only gh stack branch', async () => {
      const localStack = { branches: [{ branch: 'feat/layer-1' }, { branch: 'feat/layer-2-local' }] };
      mockCheckouts({ path: `${ARCHIVE.path}@worktree-flow`, branch: 'feat/layer-2-local' });
      readLocalStacks.mockImplementation(async (path: string) => (path === ARCHIVE.path ? [localStack] : []));

      expect(await loadStackClone(toStackAction(1), [CLONE, ARCHIVE])).toEqual(ARCHIVE);
    });

    it('should take the longer clone whose stack folder is mid-rebase', async () => {
      mockCheckouts(MID_REBASE);
      readLocalStacks.mockResolvedValue([]);
      mockRebasing('feat/layer-1');

      expect(await loadStackClone(toStackAction(1, 2), [CLONE, ARCHIVE])).toEqual(ARCHIVE);
    });

    it('should fall back to the shortest clone when none holds a stack branch', async () => {
      mockCheckouts();
      readLocalStacks.mockResolvedValue([]);

      expect(await loadStackClone(toStackAction(1, 2), [ARCHIVE, CLONE])).toEqual(CLONE);
    });

    it('should find no clone, reading nothing, when the repo has none', async () => {
      expect(await loadStackClone(toStackAction(1), [{ path: '/w/other', nameWithOwner: 'avivbens/other' }])).toBe(
        undefined,
      );
      expect(getCheckouts).not.toHaveBeenCalled();
      expect(readLocalStacks).not.toHaveBeenCalled();
    });
  });
});
