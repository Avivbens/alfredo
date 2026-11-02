import { secondsToMilliseconds } from 'date-fns';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const STATUS_TIMEOUT_MS = secondsToMilliseconds(1);

/**
 * A slow or broken repo counts as clean, so one checkout never blocks the whole list. Optional locks stay off,
 * so this background status never refreshes the index and takes `index.lock` from a git command the user is running.
 */
export async function isDirty(path: string, timeout = STATUS_TIMEOUT_MS): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('git', ['--no-optional-locks', '-C', path, 'status', '--porcelain'], {
      timeout,
    });

    return stdout.trim() !== '';
  } catch {
    return false;
  }
}
