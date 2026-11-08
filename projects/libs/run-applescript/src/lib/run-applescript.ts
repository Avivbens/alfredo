import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface RunAppleScriptOptions {
  humanReadableOutput?: boolean;
  language?: 'AppleScript' | 'JavaScript';
  /** osascript stops parsing options at the `-` script name, so an argument starting with `-e` stays data, never script. */
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

  const argv = [...languageArguments, ...outputArguments, '-', ...args];

  /** Security agents SIGKILL osascript when about 1 KB of script sits on its command line, so the script goes over stdin. */
  const execution = execFileAsync('osascript', argv);
  execution.child.stdin?.end(script);

  const { stdout } = await execution;
  return stdout.trim();
}
