import { secondsToMilliseconds } from 'date-fns';
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { SessionMode } from './session-mode.schema';

const execFileAsync = promisify(execFile);

const SESSION_FILE_SUFFIX = '.jsonl';

/**
 * A folder opened in a new window has an extension host that is not listening yet, so a URL sent right away is lost.
 * Waiting this long was verified to work.
 */
export const VSCODE_EXTENSION_WAIT_MS = secondsToMilliseconds(4);

export function toAgentProjectDir(home: string, path: string): string {
  return `${home}/.claude/projects/${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
}

export async function findLatestSessionId(projectDir: string): Promise<string | null> {
  try {
    const entries = await readdir(projectDir);
    const names = entries.filter((name) => name.endsWith(SESSION_FILE_SUFFIX));
    const sessions = await Promise.all(
      names.map(async (name) => {
        const { mtimeMs } = await stat(join(projectDir, name));

        return { id: name.slice(0, -SESSION_FILE_SUFFIX.length), mtimeMs };
      }),
    );
    const [latest] = sessions.sort((a, b) => b.mtimeMs - a.mtimeMs);

    return latest?.id ?? null;
  } catch {
    return null;
  }
}

export function toAgentChatUrl(sessionId?: string | null): string {
  const base = 'vscode://anthropic.claude-code/open';

  return sessionId ? `${base}?session=${encodeURIComponent(sessionId)}` : base;
}

async function findSessionToResume(mode: SessionMode, projectDir: string): Promise<string | null> {
  if (mode !== 'resume') {
    return null;
  }

  return findLatestSessionId(projectDir);
}

export async function startVSCodeSession(options: { path: string; mode: SessionMode; home: string }): Promise<void> {
  const { path, mode, home } = options;

  await execFileAsync('open', ['-a', 'Visual Studio Code', path]);
  await new Promise((resolve) => setTimeout(resolve, VSCODE_EXTENSION_WAIT_MS));

  const sessionId = await findSessionToResume(mode, toAgentProjectDir(home, path));

  await execFileAsync('open', [toAgentChatUrl(sessionId)]);
}
