import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { startSession, startVSCodeSession, toAgentCommand } from '@alfredo/terminal-session';
import type { Clone } from '../../models/clone.schema';
import type { LaunchAction, PrAction, StackAction, TaskAction } from '../../models/launch-action.schema';
import type { Settings } from '../../models/settings.model';
import type { WorktreeResult } from '../../models/worktree-result.schema';
import { getTrunk } from '../git-refs/trunk.service';
import { loadPrStates } from '../pull-requests/pr-match.service';
import { findClones } from '../repos/clone-index.service';
import { loadStackClone } from '../stacks/pr-list.service';
import { toCommandError } from '../system/git.service';
import { detectInstallCommand, runInstallInBackground } from '../system/install.service';
import { ensurePrWorktree } from '../worktrees/pr-worktree.service';
import { ensureStackWorktree } from '../worktrees/stack-worktree.service';
import { ensureTaskWorktree } from '../worktrees/task-worktree.service';

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
async function findClone(
  nameWithOwner: string,
  settings: Settings,
  pickClone: (clones: Clone[]) => Promise<Clone | undefined>,
): Promise<Clone> {
  const clones = await findClones(settings.repo_roots, settings.scan_depth);
  const clone = await pickClone(clones);
  if (!clone) {
    throw new Error(`No local clone of ${nameWithOwner} under your repo roots`);
  }

  return clone;
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

  const clone = await findClone(pr.nameWithOwner, settings, async (clones) => {
    const [state] = await loadPrStates([pr], clones);

    return state?.clone;
  });
  const worktree = await ensurePrWorktree(clone, pr);

  /** A fork's install scripts are code from outside the repo, so a fork PR never installs on its own. */
  await openWorktree(worktree, mode, settings, { skipInstall: pr.isCrossRepository });
}

async function launchTask({ branch, clone, mode }: TaskAction, settings: Settings): Promise<void> {
  const trunk = await getTrunk(clone);
  const worktree = await ensureTaskWorktree(clone, branch, trunk);

  await openWorktree(worktree, mode, settings);
}

async function launchStack(action: StackAction, settings: Settings): Promise<string | undefined> {
  const clone = await findClone(action.nameWithOwner, settings, (clones) => loadStackClone(action, clones));
  const result = await ensureStackWorktree(clone, action, homedir());

  await openWorktree(result, action.mode, settings);

  return result.notice;
}

/** A dirty folder still opens, so the stayed-on-branch reason comes back as a notice rather than an error. */
export async function launch(action: LaunchAction, settings: Settings): Promise<string | undefined> {
  switch (action.kind) {
    case 'pr': {
      await launchPr(action, settings);

      return;
    }
    case 'task': {
      await launchTask(action, settings);

      return;
    }
    case 'stack': {
      return launchStack(action, settings);
    }
  }
}
