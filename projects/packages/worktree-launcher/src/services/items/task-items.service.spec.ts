import { describe, expect, it, vi } from 'vitest';
import type { LaunchAction } from '../../models/launch-action.schema';
import type { AppRouter } from '../../models/routes.model';
import { toRepoItems, toTaskItems } from './task-items.service';

const router = { link: vi.fn((name, options) => ({ ...options, uid: `link:${name}` })) } as unknown as AppRouter;

describe('task-items.service', () => {
  describe('toTaskItems', () => {
    it('should link one row to the repo picker', () => {
      const [item, ...rest] = toTaskItems('Agenda view', router, 'wtn');

      expect(rest).toEqual([]);
      expect(router.link).toHaveBeenCalledWith(
        'pick-repo',
        expect.objectContaining({ label: 'feat/agenda-view', state: { branch: 'feat/agenda-view' } }),
      );
      expect(item?.title).toBe('New task: feat/agenda-view');
    });

    it('should drop a route marker left in the input, so the branch has no marker', () => {
      const [item] = toTaskItems('› Agenda view', router, 'wtn');

      expect(item?.title).toBe('New task: feat/agenda-view');
    });

    it('should show an invalid row when there is no name', () => {
      expect(toTaskItems('  ', router, 'task')).toEqual([
        expect.objectContaining({ title: 'Type a task name', subtitle: 'For example: task Agenda view', valid: false }),
      ]);
    });
  });

  describe('toRepoItems', () => {
    const clone = { path: '/Users/me/dev/app', nameWithOwner: 'owner/app' };

    it('should open the editor on enter and a new session on cmd', () => {
      const [item] = toRepoItems([clone], 'feat/x', '/Users/me', '');
      const enter: LaunchAction = { kind: 'task', branch: 'feat/x', clone, mode: 'editor' };
      const cmd: LaunchAction = { kind: 'task', branch: 'feat/x', clone, mode: 'new-session' };

      expect(item?.title).toBe('owner/app');
      expect(item?.subtitle).toBe('~/dev/app');
      expect(JSON.parse(item?.arg ?? '')).toEqual(enter);
      expect(JSON.parse(item?.mods?.cmd?.arg ?? '')).toEqual(cmd);
      expect(item?.mods?.alt).toBeUndefined();
    });

    it('should show an invalid row when the filter matches no repo', () => {
      expect(toRepoItems([], 'feat/x', '/Users/me', 'zzz')).toEqual([
        expect.objectContaining({ title: 'No repo matches "zzz"', valid: false }),
      ]);
    });
  });
});
