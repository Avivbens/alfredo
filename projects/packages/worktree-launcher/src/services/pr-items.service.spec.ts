import type { AlfredListItem } from 'fast-alfred';
import { describe, expect, it } from 'vitest';
import type { LaunchAction } from '../models/launch-action.schema';
import { launchActionSchema } from '../models/launch-action.schema';
import type { PullRequest } from '../models/pull-request.schema';
import { toListItems, toPrListOutput } from './pr-items.service';
import type { ListEntry, StackGroup, StackedPullRequest } from './pr-list.service';
import { toOpenLayers } from './pr-list.service';
import type { PrState } from './pr-match.service';

const HOME = '/Users/me';
const CLONE = { path: `${HOME}/dev/alfredo`, nameWithOwner: 'avivbens/alfredo' };
const STACK_FOLDER = `${HOME}/dev/alfredo@stack-68`;

const STACK_68 = [67, 58, 59, 60, 62, 64];

function toPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    number: 123,
    title: 'Agenda view',
    url: 'https://github.com/avivbens/alfredo/pull/123',
    isDraft: false,
    headRefName: 'feat/agenda-view',
    isCrossRepository: false,
    nameWithOwner: 'avivbens/alfredo',
    source: 'mine',
    ...overrides,
  };
}

function toLayer(position: number, size: number, overrides: Partial<PullRequest> = {}): StackedPullRequest {
  const number = STACK_68[position - 1] ?? position;
  const pr = toPr({
    number,
    title: `Layer ${position}`,
    url: `https://github.com/avivbens/alfredo/pull/${number}`,
    headRefName: `feat/layer-${position}`,
    source: 'stack',
    ...overrides,
  });

  return { ...pr, stack: { number: 68, size, position } };
}

function toStack(positions: number[], size: number, overrides: Partial<StackGroup> = {}): ListEntry {
  const layers = positions.map((position) => ({ pr: toLayer(position, size) }));

  return {
    kind: 'stack',
    group: { number: 68, size, nameWithOwner: 'avivbens/alfredo', layers, clone: CLONE, ...overrides },
  };
}

function toEntries(states: PrState[]): ListEntry[] {
  return states.map((state) => ({ kind: 'pr', state }));
}

function toAction(arg: string | undefined): LaunchAction {
  return launchActionSchema.parse(JSON.parse(arg ?? ''));
}

function toShiftArg(item: AlfredListItem | undefined): string | undefined {
  return (item?.mods as Record<string, { arg: string }> | undefined)?.['shift']?.arg;
}

describe('pr-items.service', () => {
  describe('toListItems', () => {
    it('should show the worktree path with ~', () => {
      const state: PrState = {
        pr: toPr(),
        clone: CLONE,
        worktree: { path: `${HOME}/dev/alfredo@agenda-view`, branch: 'feat/agenda-view' },
      };

      const [item] = toListItems(toEntries([state]), [], HOME);

      expect(item).toMatchObject({
        title: 'Agenda view',
        subtitle: 'avivbens/alfredo #123 · ~/dev/alfredo@agenda-view',
      });
    });

    it('should say no worktree when the clone has none on the branch', () => {
      const [item] = toListItems(toEntries([{ pr: toPr(), clone: CLONE }]), [], HOME);

      expect(item?.subtitle).toBe('avivbens/alfredo #123 · no worktree');
      expect(toAction(item?.arg)).toMatchObject({ mode: 'editor' });
    });

    it('should say no local clone and open the browser on enter', () => {
      const [item] = toListItems(toEntries([{ pr: toPr() }]), [], HOME);

      expect(item?.subtitle).toBe('avivbens/alfredo #123 · no local clone');
      expect(toAction(item?.arg)).toMatchObject({ kind: 'pr', mode: 'browser' });
    });

    it('should map the modifier keys to a new session, a resumed one and the browser', () => {
      const [item] = toListItems(toEntries([{ pr: toPr(), clone: CLONE }]), [], HOME);

      expect(toAction(item?.mods?.cmd?.arg).mode).toBe('new-session');
      expect(toAction(item?.mods?.alt?.arg).mode).toBe('resume-session');
      expect(toAction(toShiftArg(item)).mode).toBe('browser');
    });

    it('should prefix review requests and drafts', () => {
      const states: PrState[] = [
        { pr: toPr({ source: 'review' }), clone: CLONE },
        { pr: toPr({ isDraft: true }), clone: CLONE },
        { pr: toPr({ source: 'review', isDraft: true }), clone: CLONE },
      ];

      expect(toListItems(toEntries(states), [], HOME).map((item) => item.subtitle)).toEqual([
        'Review · avivbens/alfredo #123 · no worktree',
        'Draft · avivbens/alfredo #123 · no worktree',
        'Review · Draft · avivbens/alfredo #123 · no worktree',
      ]);
    });

    it('should prefix assigned pull requests', () => {
      const assigned = toPr({
        source: 'assigned',
        number: 15287,
        nameWithOwner: 'mirovia-security/backend',
        url: 'https://github.com/Mirovia-Security/backend/pull/15287',
      });

      const [item] = toListItems(toEntries([{ pr: assigned }]), [], HOME);

      expect(item?.subtitle).toMatch(/^Assigned · mirovia-security\/backend #15287/);
    });

    it('should put issue rows first', () => {
      const items = toListItems(
        toEntries([{ pr: toPr() }]),
        [
          { kind: 'gh-missing' },
          { kind: 'gh-unauthenticated' },
          { kind: 'failed', reason: 'HTTP 502' },
          { kind: 'no-clones', roots: [`${HOME}/dev`], depth: 3 },
        ],
        HOME,
      );

      expect(items.map((item) => item.title)).toEqual([
        'Install the GitHub CLI (gh)',
        'Run gh auth login',
        'Could not load pull requests',
        'No git repos found under ~/dev',
        'Agenda view',
      ]);
      expect(items[3]?.subtitle).toContain('Scan depth');
      expect(items.slice(0, 4).every((item) => item.valid === false)).toBe(true);
    });

    it('should head a stack with a label only, giving its number, repo name, open layer count and folder', () => {
      const entry = toStack([1, 2, 3], 3, { folder: { path: STACK_FOLDER, branch: 'feat/layer-1' } });

      const [header, ...layers] = toListItems([entry], [], HOME);

      expect(header).toEqual({
        title: '┌ Stack 68 · alfredo · 3 PRs',
        subtitle: '~/dev/alfredo@stack-68',
        valid: false,
      });
      expect(layers.map(({ title, subtitle, uid }) => ({ title, subtitle, uid }))).toEqual([
        {
          title: '│ 1/3 · Layer 1',
          subtitle: 'avivbens/alfredo #67 · ~/dev/alfredo@stack-68',
          uid: 'https://github.com/avivbens/alfredo/pull/67',
        },
        {
          title: '│ 2/3 · Layer 2',
          subtitle: 'avivbens/alfredo #58 · on #67 · ~/dev/alfredo@stack-68 (on 1/3)',
          uid: 'https://github.com/avivbens/alfredo/pull/58',
        },
        {
          title: '└ 3/3 · Layer 3',
          subtitle: 'avivbens/alfredo #59 · on #58 · ~/dev/alfredo@stack-68 (on 1/3)',
          uid: 'https://github.com/avivbens/alfredo/pull/59',
        },
      ]);
    });

    it('should open a layer through the stack action, targeting its number', () => {
      const [, , layer] = toListItems([toStack([1, 2, 3], 3)], [], HOME);
      const layers = [1, 2, 3].map((position) => {
        const { number, headRefName, url } = toLayer(position, 3);

        return { number, headRefName, url, position };
      });

      expect(toAction(layer?.arg)).toEqual({
        kind: 'stack',
        nameWithOwner: 'avivbens/alfredo',
        number: 68,
        layers,
        target: 58,
        mode: 'editor',
      });
      expect(toAction(layer?.mods?.cmd?.arg)).toMatchObject({ kind: 'stack', target: 58, mode: 'new-session' });
      expect(toAction(layer?.mods?.alt?.arg)).toMatchObject({ kind: 'stack', target: 58, mode: 'resume-session' });
      expect(toAction(toShiftArg(layer))).toEqual({ kind: 'pr', pr: toLayer(2, 3), mode: 'browser' });
    });

    it('should label a layer with the layer below it and the layer its folder is on', () => {
      const entry = toStack([1, 2, 3, 4, 5, 6], 6, { folder: { path: STACK_FOLDER, branch: 'feat/layer-6' } });

      const [, , layer] = toListItems([entry], [], HOME);

      expect(layer).toMatchObject({
        title: '│ 2/6 · Layer 2',
        subtitle: 'avivbens/alfredo #58 · on #67 · ~/dev/alfredo@stack-68 (on 6/6)',
      });
    });

    it("should name the folder's branch when it is not a layer", () => {
      const entry = toStack([1, 2], 2, { folder: { path: STACK_FOLDER, branch: 'fix/other' } });

      const [, layer] = toListItems([entry], [], HOME);

      expect(layer?.subtitle).toBe('avivbens/alfredo #67 · ~/dev/alfredo@stack-68 (on fix/other)');
    });

    it('should leave out on # when the layer below is not open', () => {
      const [header, , top] = toListItems([toStack([1, 3], 3)], [], HOME);

      expect(header?.title).toBe('┌ Stack 68 · alfredo · 2 PRs');
      expect(top?.subtitle).toBe('avivbens/alfredo #59 · no worktree');
    });

    it('should keep the header and the full count when typing leaves one layer', () => {
      const openLayers = toOpenLayers([1, 2, 3].map((position) => toLayer(position, 3)));

      const items = toListItems([toStack([2], 3)], [], HOME, openLayers);

      expect(items.map(({ title }) => title)).toEqual(['┌ Stack 68 · alfredo · 3 PRs', '└ 2/3 · Layer 2']);
      expect(items[1]?.subtitle).toBe('avivbens/alfredo #58 · on #67 · no worktree');
      expect(toAction(items[1]?.arg)).toMatchObject({ layers: [{ number: 67 }, { number: 58 }, { number: 59 }] });
    });

    it("should open a review stack's layers in the browser when there is no local clone", () => {
      const top = toLayer(2, 2, { source: 'review' });
      const entry = toStack([1, 2], 2, {
        clone: undefined,
        layers: [{ pr: toLayer(1, 2, { source: 'review' }) }, { pr: top }],
      });

      const [header, , layer] = toListItems([entry], [], HOME);

      expect(header).toEqual({ title: '┌ Stack 68 · alfredo · 2 PRs', subtitle: 'no local clone', valid: false });
      expect(layer?.subtitle).toBe('Review · avivbens/alfredo #58 · on #67 · no local clone');
      expect(toAction(layer?.arg)).toEqual({ kind: 'pr', pr: top, mode: 'browser' });
      expect(layer?.mods).not.toHaveProperty('cmd');
    });

    it('should keep the source and draft prefixes on a layer', () => {
      const layers = [{ pr: toLayer(1, 1, { source: 'review', isDraft: true }) }];

      const [, layer] = toListItems([toStack([1], 1, { layers })], [], HOME);

      expect(layer?.subtitle).toBe('Review · Draft · avivbens/alfredo #67 · no worktree');
    });

    it('should draw each stack as a tree over the layers shown, leaving loose rows bare', () => {
      const entries: ListEntry[] = [
        ...toEntries([{ pr: toPr(), clone: CLONE }]),
        toStack([1, 3, 4], 4),
        toStack([1, 2], 2, { number: 70 }),
        ...toEntries([{ pr: toPr({ number: 1, title: 'Fix login' }) }]),
      ];

      expect(toListItems(entries, [], HOME).map(({ title }) => title)).toEqual([
        'Agenda view',
        '┌ Stack 68 · alfredo · 3 PRs',
        '│ 1/4 · Layer 1',
        '│ 3/4 · Layer 3',
        '└ 4/4 · Layer 4',
        '┌ Stack 70 · alfredo · 2 PRs',
        '│ 1/2 · Layer 1',
        '└ 2/2 · Layer 2',
        'Fix login',
      ]);
    });

    it('should give every row but the headers an arg and modifiers that parse as launch actions', () => {
      const entries: ListEntry[] = [
        ...toEntries([{ pr: toPr(), clone: CLONE }, { pr: toPr({ number: 1 }) }]),
        toStack([1, 2, 3], 3, { folder: { path: STACK_FOLDER, branch: 'feat/layer-2' } }),
        toStack([1, 2], 2, { clone: undefined }),
      ];

      const items = toListItems(entries, [], HOME).filter(({ valid }) => valid !== false);
      const args = items.flatMap((item) => [item.arg, ...Object.values(item.mods ?? {}).map((mod) => mod?.arg)]);

      expect(items).toHaveLength(7);
      expect(args).toHaveLength(22);
      expect(() => args.map((arg) => toAction(arg))).not.toThrow();
    });
  });

  describe('toPrListOutput', () => {
    it("should keep the list's order, so Alfred's usage knowledge never splits a stack apart", () => {
      const items = toListItems([toStack([1, 2], 2)], [], HOME);

      expect(toPrListOutput(items)).toEqual({ items, skipknowledge: true });
    });
  });
});
