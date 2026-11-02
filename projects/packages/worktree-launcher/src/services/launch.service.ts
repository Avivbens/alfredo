import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { startSession, startVSCodeSession, toAgentCommand } from '@alfredo/terminal-session';
import type { Clone } from '../models/clone.schema';
import type { LaunchAction, PrAction, TaskAction } from '../models/launch-action.schema';
import type { Settings } from '../models/settings.model';
import type { WorktreeResult } from '../models/worktree-result.schema';
import { findClones } from './clone-index.service';
import { toCommandError } from './git.service';
import { detectInstallCommand, runInstallInBackground } from './install.service';
import { loadPrStates } from './pr-match.service';
import { ensurePrWorktree } from './pr-worktree.service';
import { ensureTaskWorktree } from './task-worktree.service';
import { getTrunk } from './trunk.service';

const EDITOR_APP_NAMES: Record<Settings['editor_app'], string> = {
  vscode: 'Visual Studio Code',
  cursor: 'Cursor',
};

const execFileAsync = promisify(execFile);

async function runOpen(args: string[]): Promise<void> {
  try {
    await execFileAsync('open', args);
  } catch (error) {
    throw toCommandError(error);
  }
}

/** Notifications show only the message, so the failure has to name what is missing. */
async function findClone({ pr }: PrAction, settings: Settings): Promise<Clone> {
  const clones = await findClones(settings.repo_roots, settings.scan_depth);
  const [state] = await loadPrStates([pr], clones);
  if (!state?.clone) {
    throw new Error(`No local clone of ${pr.nameWithOwner} under your repo roots`);
  }

  return state.clone;
}

async function findInstallCommand(path: string, shouldInstall: boolean): Promise<string | null> {
  if (!shouldInstall) {
    return null;
  }

  return detectInstallCommand(path);
}

/** One place for the editor and session rules, so pull request and task actions cannot drift apart. */
async function openWorktree(
  { path, created }: WorktreeResult,
  mode: Exclude<PrAction['mode'], 'browser'>,
  settings: Settings,
  { skipInstall = false }: { skipInstall?: boolean } = {},
): Promise<void> {
  const install = await findInstallCommand(path, created && !skipInstall && settings.install_after_create);
  /** A worktree created just now has no session to resume, so it starts a new one. */
  const sessionMode = mode === 'resume-session' && !created ? 'resume' : 'new';

  if (mode !== 'editor' && settings.editor_app !== 'vscode') {
    const agent = toAgentCommand(settings.agent_command, settings.agent_resume_args, sessionMode);
    await startSession({ path, command: install ? `${install} && ${agent}` : agent, terminal: settings.terminal_app });

    return;
  }

  /** The editor and VS Code's chat have no terminal to chain the install in front of, so it runs on its own. */
  if (install) {
    runInstallInBackground(path, install);
  }
  if (mode === 'editor') {
    await runOpen(['-a', EDITOR_APP_NAMES[settings.editor_app], path]);

    return;
  }
  await startVSCodeSession({ path, mode: sessionMode, home: homedir() });
}

async function launchPr(action: PrAction, settings: Settings): Promise<void> {
  const { pr, mode } = action;
  if (mode === 'browser') {
    await runOpen([pr.url]);

    return;
  }

  const clone = await findClone(action, settings);
  const worktree = await ensurePrWorktree(clone, pr);

  /** A fork's install scripts are code from outside the repo, so a fork PR never installs on its own. */
  await openWorktree(worktree, mode, settings, { skipInstall: pr.isCrossRepository });
}

async function launchTask({ branch, clone, mode }: TaskAction, settings: Settings): Promise<void> {
  const trunk = await getTrunk(clone);
  const worktree = await ensureTaskWorktree(clone, branch, trunk);

  await openWorktree(worktree, mode, settings);
}

export async function launch(action: LaunchAction, settings: Settings): Promise<void> {
  switch (action.kind) {
    case 'pr': {
      await launchPr(action, settings);

      return;
    }
    case 'task': {
      await launchTask(action, settings);

      return;
    }
  }
}
