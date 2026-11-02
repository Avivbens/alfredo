import { describe, expect, it } from 'vitest';
import type { LaunchAction } from '../models/launch-action.schema';
import { launchActionSchema } from '../models/launch-action.schema';
import type { PullRequest } from '../models/pull-request.schema';
import { toPrItems } from './pr-items.service';
import type { PrState } from './pr-match.service';

const HOME = '/Users/me';
const CLONE = { path: `${HOME}/dev/alfredo`, nameWithOwner: 'avivbens/alfredo' };

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

function toAction(arg: string | undefined): LaunchAction {
  return launchActionSchema.parse(JSON.parse(arg ?? ''));
}

describe('pr-items.service', () => {
  describe('toPrItems', () => {
    it('should show the worktree path with ~', () => {
      const state: PrState = {
        pr: toPr(),
        clone: CLONE,
        worktree: { path: `${HOME}/dev/alfredo@agenda-view`, branch: 'feat/agenda-view' },
      };

      const [item] = toPrItems([state], [], HOME);

      expect(item).toMatchObject({
        title: 'Agenda view',
        subtitle: 'avivbens/alfredo #123 · ~/dev/alfredo@agenda-view',
      });
    });

    it('should say no worktree when the clone has none on the branch', () => {
      const [item] = toPrItems([{ pr: toPr(), clone: CLONE }], [], HOME);

      expect(item?.subtitle).toBe('avivbens/alfredo #123 · no worktree');
      expect(toAction(item?.arg)).toMatchObject({ mode: 'editor' });
    });

    it('should say no local clone and open the browser on enter', () => {
      const [item] = toPrItems([{ pr: toPr() }], [], HOME);

      expect(item?.subtitle).toBe('avivbens/alfredo #123 · no local clone');
      expect(toAction(item?.arg)).toMatchObject({ kind: 'pr', mode: 'browser' });
    });

    it('should map the modifier keys to a new session, a resumed one and the browser', () => {
      const [item] = toPrItems([{ pr: toPr(), clone: CLONE }], [], HOME);

      expect(toAction(item?.mods?.cmd?.arg).mode).toBe('new-session');
      expect(toAction(item?.mods?.alt?.arg).mode).toBe('resume-session');
      expect(toAction((item?.mods as Record<string, { arg: string }> | undefined)?.['shift']?.arg).mode).toBe(
        'browser',
      );
    });

    it('should prefix review requests and drafts', () => {
      const states: PrState[] = [
        { pr: toPr({ source: 'review' }), clone: CLONE },
        { pr: toPr({ isDraft: true }), clone: CLONE },
        { pr: toPr({ source: 'review', isDraft: true }), clone: CLONE },
      ];

      expect(toPrItems(states, [], HOME).map((item) => item.subtitle)).toEqual([
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

      const [item] = toPrItems([{ pr: assigned }], [], HOME);

      expect(item?.subtitle).toMatch(/^Assigned · mirovia-security\/backend #15287/);
    });

    it('should put issue rows first', () => {
      const items = toPrItems(
        [{ pr: toPr() }],
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
  });
});
