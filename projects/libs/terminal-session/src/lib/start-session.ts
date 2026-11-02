import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { runAppleScript } from '@alfredo/run-applescript';
import { isStaleWarpConfig, toSessionLaunch } from './session-launch';
import type { Terminal } from './terminal.schema';

const execFileAsync = promisify(execFile);

/** Warp lists every config in its folder; a failed cleanup only leaves files behind, so it never fails the launch. */
async function removeStaleWarpConfigs(dir: string): Promise<void> {
  const now = Date.now();
  const names = await readdir(dir).catch((): string[] => []);

  await Promise.allSettled(
    names.map(async (name) => {
      const path = join(dir, name);
      const { mtimeMs } = await stat(path);
      if (isStaleWarpConfig(name, mtimeMs, now)) {
        await unlink(path);
      }
    }),
  );
}

export async function startSession({
  path,
  command,
  terminal,
}: {
  path: string;
  command: string;
  terminal: Terminal;
}): Promise<void> {
  const launch = toSessionLaunch(terminal, path, command, homedir(), randomUUID());

  if (launch.kind === 'applescript') {
    await runAppleScript(launch.script);
    return;
  }

  await mkdir(dirname(launch.configPath), { recursive: true });
  await writeFile(launch.configPath, launch.config);
  await execFileAsync('open', [launch.url]);
  await removeStaleWarpConfigs(dirname(launch.configPath));
}
