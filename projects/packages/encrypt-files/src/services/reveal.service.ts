import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Revealing is a courtesy once the zip is written, so a Finder hiccup must not turn a success into a failure */
export async function revealInFinder(path: string): Promise<void> {
  try {
    await execFileAsync('open', ['-R', path]);
  } catch {
    return;
  }
}
