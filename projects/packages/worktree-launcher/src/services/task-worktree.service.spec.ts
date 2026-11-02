import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clone } from '../models/clone.schema';
import { ensureTaskWorktree } from './task-worktree.service';

const { lstat, execFile, getCheckouts, resolveTool } = vi.hoisted(() => ({
  lstat: vi.fn(),
  execFile: vi.fn(),
  getCheckouts: vi.fn(),
  resolveTool: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ lstat }));
vi.mock('node:child_process', () => ({ execFile }));
vi.mock('./tools.service', () => ({ resolveTool }));
vi.mock('@alfredo/git-worktrees', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/git-worktrees')>()),
  getCheckouts,
}));

const GIT = '/opt/homebrew/bin/git';
const CLONE: Clone = { path: '/work/app', nameWithOwner: 'owner/app' };

function calls(): { args: string[]; cwd: string }[] {
  return execFile.mock.calls.map(([, args, options]) => ({ args, cwd: options.cwd }));
}

describe('task-worktree.service', () => {
  beforeEach(() => {
    lstat.mockReset();
    execFile.mockReset();
    getCheckouts.mockReset();
    getCheckouts.mockResolvedValue([{ path: '/work/app', branch: 'master' }]);
    lstat.mockRejectedValue(new Error('ENOENT'));
    resolveTool.mockResolvedValue(GIT);
    execFile.mockImplementation((_file, _args, _options, callback) => callback(null, '', ''));
  });

  describe('ensureTaskWorktree', () => {
    it('should fetch the trunk and add a no-track branch off origin', async () => {
      expect(await ensureTaskWorktree(CLONE, 'feat/agenda-view', 'main')).toEqual({
        path: '/work/app@agenda-view',
        created: true,
      });
      expect(calls()).toEqual([
        { args: ['worktree', 'prune'], cwd: '/work/app' },
        { args: ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main'], cwd: '/work/app' },
        {
          args: [
            'worktree',
            'add',
            '--no-track',
            '-b',
            'feat/agenda-view',
            '/work/app@agenda-view',
            'refs/remotes/origin/main',
          ],
          cwd: '/work/app',
        },
      ]);
    });

    it("should open the existing worktree of the task's branch without running git", async () => {
      getCheckouts.mockResolvedValue([
        { path: '/work/app', branch: 'master' },
        { path: '/work/app@agenda-view', branch: 'feat/agenda-view' },
      ]);

      expect(await ensureTaskWorktree(CLONE, 'feat/agenda-view', 'main')).toEqual({
        path: '/work/app@agenda-view',
        created: false,
      });
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should add -2 when the folder is taken', async () => {
      lstat.mockImplementation(async (path: string) => {
        if (path !== '/work/app@agenda-view') {
          throw new Error('ENOENT');
        }
      });

      const result = await ensureTaskWorktree(CLONE, 'feat/agenda-view', 'main');

      expect(result.path).toBe('/work/app@agenda-view-2');
      expect(calls().at(-1)?.args).toContain('/work/app@agenda-view-2');
    });

    it('should not add a worktree when the fetch fails', async () => {
      execFile.mockImplementation((_file, args: string[], _options, callback) => {
        if (args[0] === 'fetch') {
          callback(
            Object.assign(new Error('Command failed'), { code: 128 }),
            '',
            'fatal: could not read from remote\n',
          );
          return;
        }
        callback(null, '', '');
      });

      await expect(ensureTaskWorktree(CLONE, 'feat/x', 'main')).rejects.toThrow('fatal: could not read from remote');
      expect(calls()).toHaveLength(2);
    });

    it('should pass a hostile trunk as one argv element, behind a full ref name', async () => {
      await ensureTaskWorktree(CLONE, 'feat/x', '-D;rm -rf ~');

      expect(calls().map(({ args }) => args.at(-1))).toEqual([
        'prune',
        '+refs/heads/-D;rm -rf ~:refs/remotes/origin/-D;rm -rf ~',
        'refs/remotes/origin/-D;rm -rf ~',
      ]);
    });
  });
});
