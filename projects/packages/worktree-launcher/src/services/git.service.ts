import type { ExecFileException } from 'node:child_process';
import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { resolveTool } from './tools.service';

/** Carries the exit code so a caller can tell an expected "no" answer from a real failure. */
export class GitError extends Error {
  constructor(
    message: string,
    readonly exitCode: ExecFileException['code'],
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/** Git prints progress lines such as `From <url>` first, so the real cause is picked by pattern before position. */
function toMessage(stderr: string, fallback: string): string {
  const lines = stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    lines.find((line) => /^(fatal|error):/.test(line)) ??
    lines.find((line) => line.includes('[rejected]')) ??
    lines[0] ??
    fallback
  );
}

export function toCommandError(error: unknown): Error {
  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';

  const fallback = error instanceof Error ? error.message : String(error);
  const message = toMessage(stderr, fallback);

  return new Error(message, { cause: error });
}

async function requireGit(): Promise<string> {
  const git = await resolveTool('git');
  if (!git) {
    throw new Error('git was not found, install it or add it to your PATH');
  }

  return git;
}

/**
 * An argv array stops shell injection. Refs go in as full names so none reads as an option, and where a short branch
 * name is passed, git already refuses names that start with `-`.
 */
export async function runGit(cwd: string, args: string[]): Promise<string> {
  const git = await requireGit();
  const env = {
    ...process.env,
    PATH: `${dirname(git)}:${process.env.PATH ?? ''}`,
    GIT_TERMINAL_PROMPT: '0',
  };

  return new Promise((resolve, reject) => {
    execFile(git, args, { cwd, env }, (error, stdout, stderr) => {
      if (error) {
        const message = toMessage(String(stderr ?? ''), error.message || 'git failed');
        reject(new GitError(message, error.code));

        return;
      }
      resolve(String(stdout));
    });
  });
}
