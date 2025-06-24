import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runAppleScript(script: string, { humanReadableOutput = true } = {}) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS only');
  }

  const outputArguments = humanReadableOutput ? [] : ['-ss'];

  const { stdout } = await execFileAsync('osascript', ['-e', script, ...outputArguments]);
  return stdout.trim();
}
