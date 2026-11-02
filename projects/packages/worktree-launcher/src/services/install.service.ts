import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { quote } from '@alfredo/command-injection';

const LOCKFILES: ReadonlyArray<{ file: string; command: string }> = [
  { file: 'pnpm-lock.yaml', command: 'pnpm install' },
  { file: 'yarn.lock', command: 'yarn install' },
  { file: 'package-lock.json', command: 'npm install' },
  { file: 'bun.lock', command: 'bun install' },
  { file: 'bun.lockb', command: 'bun install' },
];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}

export async function detectInstallCommand(path: string): Promise<string | null> {
  for (const { file, command } of LOCKFILES) {
    const hasLockfile = await exists(join(path, file));
    if (hasLockfile) {
      return command;
    }
  }

  return null;
}

/**
 * The script crosses a shell and then AppleScript, so every piece is shell-quoted (and `status` is avoided, being read-only in zsh) and the
 * messages reach AppleScript as argv items, never as source a folder name could break out of.
 */
function buildScript(path: string, command: string): string {
  const name = basename(path);
  const okMessage = quote(`Dependencies installed in ${name}`);
  const failMessage = quote(`Install failed in ${name}`);
  const notify = [
    `osascript -e 'on run argv'`,
    `-e 'display notification (item 1 of argv) with title (item 2 of argv)'`,
    `-e 'end run'`,
    `"$message"`,
    quote('Worktree Launcher'),
  ].join(' ');
  const pick = `if [ "$exit_code" -eq 0 ]; then message=${okMessage}; else message=${failMessage}; fi`;

  return `cd ${quote(path)} && ${command}; exit_code=$?; ${pick}; ${notify}`;
}

/**
 * Interactive, because nvm and similar version managers load from the interactive rc, not the login profile, and Alfred's own environment
 * lacks that PATH. Stdin is ignored, so an rc prompt reads EOF instead of hanging.
 */
export function runInstallInBackground(path: string, command: string): void {
  const script = buildScript(path, command);
  const child = spawn(process.env.SHELL ?? '/bin/zsh', ['-ilc', script], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}
