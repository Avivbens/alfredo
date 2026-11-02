import { homedir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchAction, PrAction, TaskAction } from '../models/launch-action.schema';
import type { PullRequest } from '../models/pull-request.schema';
import type { Settings } from '../models/settings.model';
import { settingsSchema } from '../models/settings.model';
import { launch } from './launch.service';

const { execFile, findClones, getCheckouts, ensurePrWorktree, detectInstallCommand, runInstallInBackground } =
  vi.hoisted(() => ({
    execFile: vi.fn(),
    findClones: vi.fn(),
    getCheckouts: vi.fn(),
    ensurePrWorktree: vi.fn(),
    detectInstallCommand: vi.fn(),
    runInstallInBackground: vi.fn(),
  }));
const { getTrunk, ensureTaskWorktree } = vi.hoisted(() => ({ getTrunk: vi.fn(), ensureTaskWorktree: vi.fn() }));
const { startSession, startVSCodeSession } = vi.hoisted(() => ({
  startSession: vi.fn(),
  startVSCodeSession: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFile }));
vi.mock('@alfredo/git-worktrees', () => ({ getCheckouts }));
vi.mock('@alfredo/terminal-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/terminal-session')>()),
  startSession,
  startVSCodeSession,
}));
vi.mock('./clone-index.service', () => ({ findClones }));
vi.mock('./pr-worktree.service', () => ({ ensurePrWorktree }));
vi.mock('./trunk.service', () => ({ getTrunk }));
vi.mock('./task-worktree.service', () => ({ ensureTaskWorktree }));
vi.mock('./install.service', () => ({ detectInstallCommand, runInstallInBackground }));

const CLONE = { path: '/work/app', nameWithOwner: 'owner/app' };
const WORKTREE = '/work/app@login';
const TASK_WORKTREE = '/work/app@agenda-view';
const PR: PullRequest = {
  number: 7,
  title: 'Add login',
  url: 'https://github.com/owner/app/pull/7',
  isDraft: false,
  headRefName: 'feat/login',
  isCrossRepository: false,
  nameWithOwner: 'owner/app',
  source: 'mine',
};
const FORK_PR: PullRequest = { ...PR, isCrossRepository: true };

function toAction(mode: PrAction['mode']): LaunchAction {
  return { kind: 'pr', pr: PR, mode };
}

function toTaskAction(mode: TaskAction['mode']): LaunchAction {
  return { kind: 'task', branch: 'feat/agenda-view', clone: CLONE, mode };
}

function toSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...settingsSchema.parse({}), ...overrides };
}

describe('launch.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    execFile.mockImplementation((_file, _args, callback) => callback(null, '', ''));
    findClones.mockResolvedValue([CLONE]);
    getCheckouts.mockResolvedValue([]);
    ensurePrWorktree.mockResolvedValue({ path: WORKTREE, created: true });
    detectInstallCommand.mockResolvedValue('pnpm install');
    getTrunk.mockResolvedValue('main');
    ensureTaskWorktree.mockResolvedValue({ path: TASK_WORKTREE, created: true });
  });

  describe('launch', () => {
    it('should create, then install in the background before opening the editor', async () => {
      const order: string[] = [];
      runInstallInBackground.mockImplementation(() => order.push('install'));
      execFile.mockImplementation((_file, _args, callback) => {
        order.push('open');
        callback(null, '', '');
      });

      await launch(toAction('editor'), toSettings());

      expect(ensurePrWorktree).toHaveBeenCalledWith(CLONE, PR);
      expect(execFile).toHaveBeenCalledWith('open', ['-a', 'Visual Studio Code', WORKTREE], expect.any(Function));
      expect(runInstallInBackground).toHaveBeenCalledWith(WORKTREE, 'pnpm install');
      expect(order).toEqual(['install', 'open']);
    });

    it('should open Cursor when it is the chosen editor', async () => {
      await launch(toAction('editor'), toSettings({ editor_app: 'cursor' }));

      expect(execFile).toHaveBeenCalledWith('open', ['-a', 'Cursor', WORKTREE], expect.any(Function));
    });

    it('should not install when the setting is off or the worktree already existed', async () => {
      await launch(toAction('editor'), toSettings({ install_after_create: false }));
      ensurePrWorktree.mockResolvedValue({ path: WORKTREE, created: false });
      await launch(toAction('editor'), toSettings());

      expect(detectInstallCommand).not.toHaveBeenCalled();
      expect(runInstallInBackground).not.toHaveBeenCalled();
    });

    it('should run install before the agent in a new session', async () => {
      await launch(toAction('new-session'), toSettings({ editor_app: 'cursor', terminal_app: 'iterm' }));

      expect(startSession).toHaveBeenCalledWith({
        path: WORKTREE,
        command: 'pnpm install && claude',
        terminal: 'iterm',
      });
      expect(runInstallInBackground).not.toHaveBeenCalled();
    });

    it('should resume without creating when the worktree exists', async () => {
      ensurePrWorktree.mockResolvedValue({ path: WORKTREE, created: false });

      await launch(toAction('resume-session'), toSettings({ editor_app: 'cursor' }));

      expect(startSession).toHaveBeenCalledWith({ path: WORKTREE, command: 'claude --continue', terminal: 'native' });
    });

    it('should start a new session instead of resuming when the worktree was just created', async () => {
      await launch(toAction('resume-session'), toSettings({ editor_app: 'cursor', install_after_create: false }));

      expect(startSession).toHaveBeenCalledWith({ path: WORKTREE, command: 'claude', terminal: 'native' });
    });

    it('should not install for a fork PR on enter', async () => {
      await launch({ kind: 'pr', pr: FORK_PR, mode: 'editor' }, toSettings());

      expect(execFile).toHaveBeenCalledWith('open', ['-a', 'Visual Studio Code', WORKTREE], expect.any(Function));
      expect(detectInstallCommand).not.toHaveBeenCalled();
      expect(runInstallInBackground).not.toHaveBeenCalled();
    });

    it('should not prefix the install for a fork PR in a terminal session', async () => {
      await launch({ kind: 'pr', pr: FORK_PR, mode: 'new-session' }, toSettings({ editor_app: 'cursor' }));

      expect(startSession).toHaveBeenCalledWith({ path: WORKTREE, command: 'claude', terminal: 'native' });
      expect(detectInstallCommand).not.toHaveBeenCalled();
    });

    it('should not install in the background for a fork PR in a VS Code session', async () => {
      await launch({ kind: 'pr', pr: FORK_PR, mode: 'new-session' }, toSettings({ editor_app: 'vscode' }));

      expect(startVSCodeSession).toHaveBeenCalledWith({ path: WORKTREE, mode: 'new', home: homedir() });
      expect(runInstallInBackground).not.toHaveBeenCalled();
    });

    describe('with VS Code as the editor', () => {
      it('should open a new VS Code chat for cmd when the editor is VS Code', async () => {
        ensurePrWorktree.mockResolvedValue({ path: WORKTREE, created: false });

        await launch(toAction('new-session'), toSettings({ editor_app: 'vscode' }));

        expect(startVSCodeSession).toHaveBeenCalledWith({ path: WORKTREE, mode: 'new', home: homedir() });
        expect(startSession).not.toHaveBeenCalled();
      });

      it('should resume the latest VS Code session for alt when the worktree already existed', async () => {
        ensurePrWorktree.mockResolvedValue({ path: WORKTREE, created: false });

        await launch(toAction('resume-session'), toSettings({ editor_app: 'vscode' }));

        expect(startVSCodeSession).toHaveBeenCalledWith({ path: WORKTREE, mode: 'resume', home: homedir() });
      });

      it('should start a new VS Code chat for alt on a just-created worktree', async () => {
        await launch(toAction('resume-session'), toSettings({ editor_app: 'vscode', install_after_create: false }));

        expect(startVSCodeSession).toHaveBeenCalledWith({ path: WORKTREE, mode: 'new', home: homedir() });
        expect(runInstallInBackground).not.toHaveBeenCalled();
      });

      it('should install in the background before opening VS Code for a just-created worktree', async () => {
        const order: string[] = [];
        runInstallInBackground.mockImplementation(() => order.push('install'));
        startVSCodeSession.mockImplementation(async () => order.push('vscode'));

        await launch(toAction('new-session'), toSettings({ editor_app: 'vscode' }));

        expect(runInstallInBackground).toHaveBeenCalledWith(WORKTREE, 'pnpm install');
        expect(order).toEqual(['install', 'vscode']);
      });

      it('should keep terminal sessions when the editor is Cursor', async () => {
        await launch(toAction('new-session'), toSettings({ editor_app: 'cursor' }));

        expect(startSession).toHaveBeenCalledWith({
          path: WORKTREE,
          command: 'pnpm install && claude',
          terminal: 'native',
        });
        expect(startVSCodeSession).not.toHaveBeenCalled();
      });
    });

    describe('with a task action', () => {
      it('should create the task worktree and open the editor', async () => {
        await launch(toTaskAction('editor'), toSettings());

        expect(getTrunk).toHaveBeenCalledWith(CLONE);
        expect(ensureTaskWorktree).toHaveBeenCalledWith(CLONE, 'feat/agenda-view', 'main');
        expect(execFile).toHaveBeenCalledWith(
          'open',
          ['-a', 'Visual Studio Code', TASK_WORKTREE],
          expect.any(Function),
        );
        expect(runInstallInBackground).toHaveBeenCalledWith(TASK_WORKTREE, 'pnpm install');
        expect(ensurePrWorktree).not.toHaveBeenCalled();
      });

      it('should start a new VS Code chat for cmd when the editor is VS Code', async () => {
        await launch(toTaskAction('new-session'), toSettings({ editor_app: 'vscode' }));

        expect(startVSCodeSession).toHaveBeenCalledWith({ path: TASK_WORKTREE, mode: 'new', home: homedir() });
        expect(runInstallInBackground).toHaveBeenCalledWith(TASK_WORKTREE, 'pnpm install');
        expect(startSession).not.toHaveBeenCalled();
      });

      it('should start a terminal session behind the install for cmd when the editor is Cursor', async () => {
        await launch(toTaskAction('new-session'), toSettings({ editor_app: 'cursor', terminal_app: 'warp' }));

        expect(startSession).toHaveBeenCalledWith({
          path: TASK_WORKTREE,
          command: 'pnpm install && claude',
          terminal: 'warp',
        });
        expect(startVSCodeSession).not.toHaveBeenCalled();
      });

      it('should not install when the setting is off', async () => {
        await launch(toTaskAction('editor'), toSettings({ install_after_create: false }));

        expect(detectInstallCommand).not.toHaveBeenCalled();
      });

      it('should rethrow a git failure so the notification shows it', async () => {
        ensureTaskWorktree.mockRejectedValue(new Error("fatal: a branch named 'feat/agenda-view' already exists"));

        await expect(launch(toTaskAction('editor'), toSettings())).rejects.toThrow('already exists');
        expect(execFile).not.toHaveBeenCalled();
      });
    });

    it('should report the first stderr line when open fails', async () => {
      execFile.mockImplementation((_file, _args, callback) =>
        callback(
          Object.assign(new Error('Command failed: open'), { stderr: '\nThe application cannot be found\nmore\n' }),
        ),
      );

      await expect(launch(toAction('editor'), toSettings())).rejects.toThrow(/^The application cannot be found$/);
    });

    it('should open the pull request in the browser without touching git', async () => {
      await launch(toAction('browser'), toSettings());

      expect(execFile).toHaveBeenCalledWith('open', [PR.url], expect.any(Function));
      expect(ensurePrWorktree).not.toHaveBeenCalled();
    });

    it('should explain that there is no local clone instead of launching', async () => {
      findClones.mockResolvedValue([]);

      await expect(launch(toAction('editor'), toSettings())).rejects.toThrow('No local clone of owner/app');
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should rethrow a git failure so the notification shows it', async () => {
      ensurePrWorktree.mockRejectedValue(new Error('fatal: invalid reference: feat/login'));

      await expect(launch(toAction('new-session'), toSettings())).rejects.toThrow('fatal: invalid reference');
      expect(startSession).not.toHaveBeenCalled();
    });
  });
});
