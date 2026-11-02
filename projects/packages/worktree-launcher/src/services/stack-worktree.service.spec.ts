import { secondsToMilliseconds } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worktree } from '@alfredo/git-worktrees';
import type { Clone } from '../models/clone.schema';
import type { StackAction, StackLayer } from '../models/launch-action.schema';
import { ensureStackWorktree } from './stack-worktree.service';

const { lstat, readFile, execFile, getCheckouts, resolveTool } = vi.hoisted(() => ({
  lstat: vi.fn(),
  readFile: vi.fn(),
  execFile: vi.fn(),
  getCheckouts: vi.fn(),
  resolveTool: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ lstat, readFile }));
vi.mock('node:child_process', () => ({ execFile }));
vi.mock('./tools.service', () => ({ resolveTool }));
vi.mock('@alfredo/git-worktrees', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/git-worktrees')>()),
  getCheckouts,
}));

const GIT = '/opt/homebrew/bin/git';
const HOME = '/Users/me';
const CLONE: Clone = { path: '/Users/me/dev/alfredo', nameWithOwner: 'Avivbens/alfredo' };
const STACK_PATH = '/Users/me/dev/alfredo@stack-68';
const OLD_SHA = '1111111111111111111111111111111111111111';

const LAYERS: StackLayer[] = [67, 58, 59].map((number, index) => ({
  number,
  headRefName: `feat/layer-${index + 1}`,
  url: `https://github.com/Avivbens/alfredo/pull/${number}`,
  position: index + 1,
}));

const MAIN: Worktree = { path: CLONE.path, branch: 'master' };
const FOLDER: Worktree = { path: STACK_PATH, branch: 'feat/layer-1' };

const STATUS = {
  args: ['--no-optional-locks', 'status', '--porcelain'],
  cwd: STACK_PATH,
  timeout: secondsToMilliseconds(2),
};
const FETCH_LAYER_2 = {
  args: ['fetch', 'origin', '+refs/heads/feat/layer-2:refs/remotes/origin/feat/layer-2'],
  cwd: CLONE.path,
};
const SHOW_REF_LAYER_2 = { args: ['show-ref', '--verify', '--quiet', 'refs/heads/feat/layer-2'], cwd: CLONE.path };
const MERGE_BASE_LAYER_2 = {
  args: ['merge-base', '--is-ancestor', 'refs/heads/feat/layer-2', 'refs/remotes/origin/feat/layer-2'],
  cwd: CLONE.path,
};

/** A real `.git/gh-stack` trimmed to the fields read: the top branch came from `gh stack add` and is not pushed yet. */
const GH_STACK_FILE = {
  schemaVersion: 1,
  stacks: [
    {
      number: 68,
      branches: [
        ...LAYERS.map(({ number, headRefName }) => ({ branch: headRefName, pullRequest: { number } })),
        { branch: 'feat/layer-4-local' },
      ],
    },
  ],
};

type GitReply = { stdout?: string; error?: Error; stderr?: string };

function toAction(overrides: Partial<StackAction> = {}): StackAction {
  return {
    kind: 'stack',
    nameWithOwner: CLONE.nameWithOwner,
    number: 68,
    layers: LAYERS,
    target: 58,
    mode: 'editor',
    ...overrides,
  };
}

function gitFails(code: number): Error {
  return Object.assign(new Error('Command failed'), { code });
}

/** Answers each subcommand from the table and succeeds everything else, with `rev-parse` printing a sha. */
function replyWith(replies: Record<string, GitReply>): void {
  execFile.mockImplementation((_file, args: string[], _options, callback) => {
    const subcommand = args.find((arg) => !arg.startsWith('-')) ?? '';
    const {
      error = null,
      stdout = subcommand === 'rev-parse' ? `${OLD_SHA}\n` : '',
      stderr = '',
    } = replies[subcommand] ?? {};
    callback(error, stdout, stderr);
  });
}

function calls(): { args: string[]; cwd: string; timeout?: number }[] {
  return execFile.mock.calls.map(([, args, options]) => ({ args, cwd: options.cwd, timeout: options.timeout }));
}

describe('stack-worktree.service', () => {
  beforeEach(() => {
    lstat.mockReset();
    readFile.mockReset();
    execFile.mockReset();
    getCheckouts.mockReset();
    lstat.mockRejectedValue(new Error('ENOENT'));
    readFile.mockRejectedValue(new Error('ENOENT'));
    resolveTool.mockResolvedValue(GIT);
    getCheckouts.mockResolvedValue([MAIN, FOLDER]);
    replyWith({});
  });

  describe('ensureStackWorktree', () => {
    it('should open the checkout already on the layer, over the stack path, without running git', async () => {
      const onLayer: Worktree = { path: '/Users/me/dev/alfredo@search-gif', branch: 'feat/layer-2' };
      getCheckouts.mockResolvedValue([MAIN, FOLDER, onLayer]);

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: onLayer.path, created: false });
      expect(getCheckouts).toHaveBeenCalledWith(CLONE.path);
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should switch a clean folder to a layer with no local branch, tracking origin', async () => {
      replyWith({ 'show-ref': { error: gitFails(1) } });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: STACK_PATH, created: false });
      expect(calls()).toEqual([
        STATUS,
        FETCH_LAYER_2,
        SHOW_REF_LAYER_2,
        { args: ['switch', '--track', '-c', 'feat/layer-2', 'origin/feat/layer-2'], cwd: STACK_PATH },
      ]);
    });

    it('should fast-forward a local branch that is behind origin in the clone, then switch the folder', async () => {
      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: STACK_PATH, created: false });
      expect(calls()).toEqual([
        STATUS,
        FETCH_LAYER_2,
        SHOW_REF_LAYER_2,
        MERGE_BASE_LAYER_2,
        { args: ['rev-parse', 'refs/heads/feat/layer-2'], cwd: CLONE.path },
        {
          args: ['update-ref', 'refs/heads/feat/layer-2', 'refs/remotes/origin/feat/layer-2', OLD_SHA],
          cwd: CLONE.path,
        },
        { args: ['switch', 'feat/layer-2'], cwd: STACK_PATH },
      ]);
    });

    it('should switch to a diverged local branch as it is, never moving it', async () => {
      replyWith({ 'merge-base': { error: gitFails(1) } });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: STACK_PATH, created: false });
      expect(calls()).toEqual([
        STATUS,
        FETCH_LAYER_2,
        SHOW_REF_LAYER_2,
        MERGE_BASE_LAYER_2,
        { args: ['switch', 'feat/layer-2'], cwd: STACK_PATH },
      ]);
    });

    it('should switch a folder found through a local-only gh stack branch', async () => {
      const local: Worktree = { path: '/Users/me/dev/alfredo@worktree-flow', branch: 'feat/layer-4-local' };
      getCheckouts.mockResolvedValue([MAIN, local]);
      readFile.mockResolvedValue(JSON.stringify(GH_STACK_FILE));

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: local.path, created: false });
      expect(readFile).toHaveBeenCalledWith('/Users/me/dev/alfredo/.git/gh-stack', 'utf8');
      expect(calls().at(-1)).toEqual({ args: ['switch', 'feat/layer-2'], cwd: local.path });
    });

    it('should stay on the branch of a dirty folder and say so', async () => {
      replyWith({ status: { stdout: ' M src/index.ts\n' } });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({
        path: STACK_PATH,
        created: false,
        notice: 'Stayed on feat/layer-1: ~/dev/alfredo@stack-68 has uncommitted changes',
      });
      expect(calls()).toEqual([STATUS]);
    });

    it('should stay on the branch of a folder with untracked files, so a new file never follows the switch', async () => {
      replyWith({ status: { stdout: '?? notes.md\n' } });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({
        path: STACK_PATH,
        created: false,
        notice: 'Stayed on feat/layer-1: ~/dev/alfredo@stack-68 has uncommitted changes',
      });
      expect(calls()).toEqual([STATUS]);
    });

    it('should treat a status check that timed out as not clean', async () => {
      const timedOut = Object.assign(new Error('Command failed: git status'), {
        killed: true,
        signal: 'SIGTERM',
        code: null,
      });
      replyWith({ status: { error: timedOut } });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toMatchObject({
        path: STACK_PATH,
        created: false,
        notice: 'Stayed on feat/layer-1: ~/dev/alfredo@stack-68 has uncommitted changes',
      });
      expect(calls()).toEqual([STATUS]);
    });

    it("should reject with git's fatal line when the switch fails", async () => {
      replyWith({
        switch: {
          error: gitFails(128),
          stderr:
            "fatal: Unable to create '/Users/me/dev/alfredo/.git/worktrees/alfredo@stack-68/index.lock': File exists.\n\n" +
            'Another git process seems to be running in this repository, e.g.\n' +
            "an editor opened by 'git commit'. Please make sure all processes\n",
        },
      });

      await expect(ensureStackWorktree(CLONE, toAction(), HOME)).rejects.toThrow(
        /^fatal: Unable to create '.+index\.lock': File exists\.$/,
      );
      expect(calls().at(-1)).toEqual({ args: ['switch', 'feat/layer-2'], cwd: STACK_PATH });
    });

    it('should open the stack folder mid-rebase unchanged, with no git at all, and say so', async () => {
      getCheckouts.mockResolvedValue([MAIN, { path: STACK_PATH, branch: 'a1b2c3d' }]);
      const files: Record<string, string> = {
        [`${STACK_PATH}/.git`]: 'gitdir: /Users/me/dev/alfredo/.git/worktrees/alfredo@stack-68\n',
        '/Users/me/dev/alfredo/.git/worktrees/alfredo@stack-68/rebase-merge/head-name': 'refs/heads/feat/layer-1\n',
      };
      readFile.mockImplementation(async (path: string) => {
        const content = files[path];
        if (content === undefined) {
          throw new Error('ENOENT');
        }

        return content;
      });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({
        path: STACK_PATH,
        created: false,
        notice: 'Stayed on feat/layer-1: ~/dev/alfredo@stack-68 is in the middle of a rebase',
      });
      expect(calls()).toEqual([]);
    });

    it('should switch a linked worktree in the stack rather than the main checkout', async () => {
      const linked: Worktree = { path: '/Users/me/dev/alfredo@worktree-flow', branch: 'feat/layer-3' };
      getCheckouts.mockResolvedValue([{ path: CLONE.path, branch: 'feat/layer-1' }, linked]);

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: linked.path, created: false });
      expect(calls().at(-1)).toEqual({ args: ['switch', 'feat/layer-2'], cwd: linked.path });
    });

    it("should reject with git's fatal line, without switching, when the fetch fails", async () => {
      replyWith({
        fetch: { error: gitFails(128), stderr: "fatal: couldn't find remote ref refs/heads/feat/layer-2\n" },
      });

      await expect(ensureStackWorktree(CLONE, toAction(), HOME)).rejects.toThrow(
        /^fatal: couldn't find remote ref refs\/heads\/feat\/layer-2$/,
      );
      expect(calls()).toEqual([STATUS, FETCH_LAYER_2]);
    });

    it('should create the stack folder on the layer, fetching every layer in one call', async () => {
      getCheckouts.mockResolvedValue([MAIN]);

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({ path: STACK_PATH, created: true });
      expect(calls()).toEqual([
        { args: ['worktree', 'prune'], cwd: CLONE.path },
        {
          args: [
            'fetch',
            'origin',
            '+refs/heads/feat/layer-1:refs/remotes/origin/feat/layer-1',
            '+refs/heads/feat/layer-2:refs/remotes/origin/feat/layer-2',
            '+refs/heads/feat/layer-3:refs/remotes/origin/feat/layer-3',
          ],
          cwd: CLONE.path,
        },
        SHOW_REF_LAYER_2,
        MERGE_BASE_LAYER_2,
        { args: ['rev-parse', 'refs/heads/feat/layer-2'], cwd: CLONE.path },
        {
          args: ['update-ref', 'refs/heads/feat/layer-2', 'refs/remotes/origin/feat/layer-2', OLD_SHA],
          cwd: CLONE.path,
        },
        { args: ['worktree', 'add', STACK_PATH, 'feat/layer-2'], cwd: CLONE.path },
      ]);
    });

    it('should add -2 when an unrelated folder holds the stack path', async () => {
      getCheckouts.mockResolvedValue([MAIN, { path: STACK_PATH, branch: 'fix/other' }]);
      lstat.mockImplementation(async (path: string) => {
        if (path !== STACK_PATH) {
          throw new Error('ENOENT');
        }
      });

      expect(await ensureStackWorktree(CLONE, toAction(), HOME)).toEqual({
        path: `${STACK_PATH}-2`,
        created: true,
      });
      expect(calls().at(-1)).toEqual({ args: ['worktree', 'add', `${STACK_PATH}-2`, 'feat/layer-2'], cwd: CLONE.path });
    });

    it('should reject, before touching git, when the row names no open layer', async () => {
      await expect(ensureStackWorktree(CLONE, toAction({ target: 99 }), HOME)).rejects.toThrow(
        'Stack 68 has no open layer to open',
      );
      expect(getCheckouts).not.toHaveBeenCalled();
      expect(execFile).not.toHaveBeenCalled();
    });
  });
});
