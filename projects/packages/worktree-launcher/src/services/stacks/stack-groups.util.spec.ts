import { describe, expect, it } from 'vitest';
import type { PullRequest } from '../../models/pull-request.schema';
import type { PrState } from '../pull-requests/pr-match.util';
import type { ListEntry } from './stack-groups.util';
import { toListEntries, toOpenLayers } from './stack-groups.util';

const STACK_68 = [67, 58, 59];

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

function toSummary(entries: ListEntry[]): (number | number[])[] {
  return entries.map((entry) =>
    entry.kind === 'pr' ? entry.state.pr.number : entry.group.layers.map(({ pr }) => pr.number),
  );
}

describe('stack-groups.util', () => {
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
});
