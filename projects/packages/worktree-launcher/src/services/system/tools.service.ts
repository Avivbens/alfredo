import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';

type ToolName = 'git' | 'gh';

const HOMEBREW_DIRS: readonly string[] = ['/opt/homebrew/bin', '/usr/local/bin'];

const resolved = new Map<ToolName, Promise<string | null>>();

async function findInKnownDirs(name: ToolName): Promise<string | null> {
  for (const dir of HOMEBREW_DIRS) {
    const candidate = `${dir}/${name}`;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

/** `name` is a literal union, so interpolating it into the shell command is safe. */
function findInLoginShell(name: ToolName): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(process.env.SHELL ?? '/bin/zsh', ['-lc', `command -v ${name}`], (error, stdout) => {
      const path = error ? '' : String(stdout).trim();
      resolve(path.startsWith('/') ? path : null);
    });
  });
}

async function lookup(name: ToolName): Promise<string | null> {
  const known = await findInKnownDirs(name);
  if (known) {
    return known;
  }

  return findInLoginShell(name);
}

/** Alfred's PATH lacks Homebrew, so `git` and `gh` are located explicitly; memoized for the process. */
export function resolveTool(name: ToolName): Promise<string | null> {
  const cached = resolved.get(name);
  if (cached) {
    return cached;
  }
  const pending = lookup(name);
  resolved.set(name, pending);
  return pending;
}
