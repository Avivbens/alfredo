import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RunAppleScriptOptions {
  humanReadableOutput?: boolean;
  language?: 'AppleScript' | 'JavaScript';
  /** Must not start with `-`, or osascript parses it as an option, so callers pass JSON. */
  args?: string[];
}

export async function runAppleScript(
  script: string,
  { humanReadableOutput = true, language = 'AppleScript', args = [] }: RunAppleScriptOptions = {},
): Promise<string> {
  if (process.platform !== 'darwin') {
    throw new Error('macOS only');
  }

  const languageArguments = language === 'JavaScript' ? ['-l', 'JavaScript'] : [];
  const outputArguments = humanReadableOutput ? [] : ['-ss'];

  const argv = [...languageArguments, ...outputArguments, '-e', script, ...args];

  const { stdout } = await execFileAsync('osascript', argv);
  return stdout.trim();
}
