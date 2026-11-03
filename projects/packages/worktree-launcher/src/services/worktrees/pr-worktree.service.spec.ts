import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clone } from '../../models/clone.schema';
import type { PullRequest } from '../../models/pull-request.schema';
import { ensurePrWorktree } from './pr-worktree.service';

const { lstat, execFile, getCheckouts, resolveTool } = vi.hoisted(() => ({
  lstat: vi.fn(),
  execFile: vi.fn(),
  getCheckouts: vi.fn(),
  resolveTool: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ lstat }));
vi.mock('node:child_process', () => ({ execFile }));
vi.mock('../system/tools.service', () => ({ resolveTool }));
vi.mock('@alfredo/git-worktrees', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/git-worktrees')>()),
  getCheckouts,
}));

const GIT = '/opt/homebrew/bin/git';
const CLONE: Clone = { path: '/work/app', nameWithOwner: 'owner/app' };
const MAIN = { path: '/work/app', branch: 'master' };
const OLD_SHA = '1111111111111111111111111111111111111111';

function toPr(overrides: Partial<PullRequest>): PullRequest {
  return { number: 7, headRefName: 'feat/login', isCrossRepository: false, ...overrides } as PullRequest;
}

function gitFails(code: number): Error {
  return Object.assign(new Error('Command failed'), { code });
}

/** Fails the listed subcommands with their exit code and succeeds everything else. */
function failWith(codes: Record<string, number>, stderr = ''): void {
  execFile.mockImplementation((_file, args: string[], _options, callback) => {
    const code = args[1] === 'prune' ? undefined : codes[args[0] ?? ''];
    if (code === undefined) {
      callback(null, args[0] === 'rev-parse' ? `${OLD_SHA}\n` : '', '');

      return;
    }
    callback(gitFails(code), '', stderr);
  });
}

function calls(): { args: string[]; cwd: string }[] {
  return execFile.mock.calls.map(([, args, options]) => ({ args, cwd: options.cwd }));
}

const CWD = '/work/app';
const PRUNE = { args: ['worktree', 'prune'], cwd: CWD };

describe('pr-worktree.service', () => {
  beforeEach(() => {
    lstat.mockReset();
    execFile.mockReset();
    getCheckouts.mockReset();
    lstat.mockRejectedValue(new Error('ENOENT'));
    resolveTool.mockResolvedValue(GIT);
    failWith({});
  });

  describe('ensurePrWorktree', () => {
    it("should open the main clone when it is already on the PR's branch", async () => {
      getCheckouts.mockResolvedValue([{ path: '/work/app', branch: 'feat/login' }]);

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app', created: false });
      expect(getCheckouts).toHaveBeenCalledWith('/work/app');
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should open an existing worktree without running git', async () => {
      getCheckouts.mockResolvedValue([MAIN, { path: '/work/app@login', branch: 'feat/login' }]);

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login', created: false });
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should fast-forward a local branch that is behind origin before adding', async () => {
      getCheckouts.mockResolvedValue([MAIN]);

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login', created: true });
      expect(calls()).toEqual([
        PRUNE,
        { args: ['fetch', 'origin', '+refs/heads/feat/login:refs/remotes/origin/feat/login'], cwd: CWD },
        { args: ['show-ref', '--verify', '--quiet', 'refs/heads/feat/login'], cwd: CWD },
        {
          args: ['merge-base', '--is-ancestor', 'refs/heads/feat/login', 'refs/remotes/origin/feat/login'],
          cwd: CWD,
        },
        { args: ['rev-parse', 'refs/heads/feat/login'], cwd: CWD },
        {
          args: ['update-ref', 'refs/heads/feat/login', 'refs/remotes/origin/feat/login', OLD_SHA],
          cwd: CWD,
        },
        { args: ['worktree', 'add', '/work/app@login', 'feat/login'], cwd: CWD },
      ]);
    });

    it('should keep a local branch that has its own commits', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ 'merge-base': 1 });

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login', created: true });
      expect(calls()).toEqual([
        PRUNE,
        { args: ['fetch', 'origin', '+refs/heads/feat/login:refs/remotes/origin/feat/login'], cwd: CWD },
        { args: ['show-ref', '--verify', '--quiet', 'refs/heads/feat/login'], cwd: CWD },
        {
          args: ['merge-base', '--is-ancestor', 'refs/heads/feat/login', 'refs/remotes/origin/feat/login'],
          cwd: CWD,
        },
        { args: ['worktree', 'add', '/work/app@login', 'feat/login'], cwd: CWD },
      ]);
    });

    it('should throw when merge-base fails with another exit code', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ 'merge-base': 128 }, 'fatal: Not a valid object name');

      await expect(ensurePrWorktree(CLONE, toPr({}))).rejects.toThrow('fatal: Not a valid object name');
      expect(calls()).toHaveLength(4);
    });

    it('should create a tracking branch from origin when there is none locally', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ 'show-ref': 1 });

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login', created: true });
      expect(calls()).toEqual([
        PRUNE,
        { args: ['fetch', 'origin', '+refs/heads/feat/login:refs/remotes/origin/feat/login'], cwd: CWD },
        { args: ['show-ref', '--verify', '--quiet', 'refs/heads/feat/login'], cwd: CWD },
        {
          args: ['worktree', 'add', '--track', '-b', 'feat/login', '/work/app@login', 'origin/feat/login'],
          cwd: CWD,
        },
      ]);
    });

    it('should fetch a fork PR into pr-<n>', async () => {
      getCheckouts.mockResolvedValue([MAIN]);

      const pr = toPr({ isCrossRepository: true, headRefName: 'master' });

      expect(await ensurePrWorktree(CLONE, pr)).toEqual({ path: '/work/app@pr-7', created: true });
      expect(calls()).toEqual([
        PRUNE,
        { args: ['fetch', 'origin', 'pull/7/head:pr-7'], cwd: CWD },
        { args: ['worktree', 'add', '/work/app@pr-7', 'pr-7'], cwd: CWD },
      ]);
    });

    it("should add -2 when another branch's worktree holds the path", async () => {
      getCheckouts.mockResolvedValue([MAIN, { path: '/work/app@login', branch: 'fix/login' }]);
      lstat.mockImplementation(async (path: string) => {
        if (path !== '/work/app@login') {
          throw new Error('ENOENT');
        }
      });

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login-2', created: true });
      expect(calls().at(-1)).toEqual({
        args: ['worktree', 'add', '/work/app@login-2', 'feat/login'],
        cwd: CWD,
      });
    });

    it("should add -2 when a leftover folder that is not one of the clone's checkouts holds the path", async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      lstat.mockImplementation(async (path: string) => {
        if (path !== '/work/app@login') {
          throw new Error('ENOENT');
        }
      });

      expect(await ensurePrWorktree(CLONE, toPr({}))).toEqual({ path: '/work/app@login-2', created: true });
      expect(calls().at(-1)).toEqual({
        args: ['worktree', 'add', '/work/app@login-2', 'feat/login'],
        cwd: CWD,
      });
    });

    it('should pass a hostile branch name as one argv element', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ 'show-ref': 1 });

      await ensurePrWorktree(CLONE, toPr({ headRefName: 'feat/x;rm -rf ~' }));

      expect(calls()).toEqual([
        PRUNE,
        { args: ['fetch', 'origin', '+refs/heads/feat/x;rm -rf ~:refs/remotes/origin/feat/x;rm -rf ~'], cwd: CWD },
        { args: ['show-ref', '--verify', '--quiet', 'refs/heads/feat/x;rm -rf ~'], cwd: CWD },
        {
          args: [
            'worktree',
            'add',
            '--track',
            '-b',
            'feat/x;rm -rf ~',
            '/work/app@x;rm -rf ~',
            'origin/feat/x;rm -rf ~',
          ],
          cwd: CWD,
        },
      ]);
      expect(execFile.mock.calls.every(([file]) => file === GIT)).toBe(true);
    });

    it('should surface the first stderr line when git fails, without adding a worktree', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ fetch: 128 }, '\nfatal: could not read from remote\nhint: more\n');

      await expect(ensurePrWorktree(CLONE, toPr({}))).rejects.toThrow(/^fatal: could not read from remote$/);
      expect(calls()).toHaveLength(2);
    });

    it('should surface the rejected line of a refused fork fetch', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith(
        { fetch: 1 },
        'From https://github.com/o/r\n ! [rejected]        refs/pull/7/head -> pr-7  (non-fast-forward)\n',
      );

      await expect(ensurePrWorktree(CLONE, toPr({ isCrossRepository: true }))).rejects.toThrow(
        /^! \[rejected\]\s+refs\/pull\/7\/head -> pr-7 {2}\(non-fast-forward\)$/,
      );
    });

    it('should surface the fatal line after worktree progress text', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ worktree: 128 }, "Preparing worktree (new branch 'x')\nfatal: '/p' already exists\n");

      await expect(ensurePrWorktree(CLONE, toPr({ isCrossRepository: true }))).rejects.toThrow(
        "fatal: '/p' already exists",
      );
    });

    it('should not treat a failing show-ref other than exit 1 as a missing branch', async () => {
      getCheckouts.mockResolvedValue([MAIN]);
      failWith({ 'show-ref': 128 }, 'fatal: bad repo');

      await expect(ensurePrWorktree(CLONE, toPr({}))).rejects.toThrow('fatal: bad repo');
      expect(calls()).toHaveLength(3);
    });
  });
});
