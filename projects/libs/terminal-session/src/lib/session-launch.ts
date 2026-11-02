import { minutesToMilliseconds } from 'date-fns';
import { quote } from '@alfredo/command-injection';
import { escapeAppleScriptString } from '@alfredo/run-applescript';
import type { Terminal } from './terminal.schema';

export type SessionLaunch =
  { kind: 'applescript'; script: string } | { kind: 'warp'; configPath: string; config: string; url: string };

const WARP_CONFIG_PREFIX = 'alfredo-session';
const STALE_WARP_CONFIG_MS = minutesToMilliseconds(10);
const WARP_CONFIG_FILE = new RegExp(`^${WARP_CONFIG_PREFIX}(-[\\w-]+)?\\.yaml$`);

/** Ten minutes is far past Warp reading a config, so a concurrent launch never loses its file before it opens. */
export function isStaleWarpConfig(fileName: string, mtimeMs: number, now: number): boolean {
  return WARP_CONFIG_FILE.test(fileName) && now - mtimeMs > STALE_WARP_CONFIG_MS;
}

/**
 * Warp has no scripting API, so the session goes through a launch configuration opened by a name unique to the
 * launch, since every workflow shares Warp's one folder. `cwd` handles the folder, so `exec` is the command alone.
 * JSON strings are valid YAML scalars.
 */
function toWarpLaunch(path: string, command: string, home: string, launchId: string): SessionLaunch {
  const name = `${WARP_CONFIG_PREFIX}-${launchId}`;
  const config = [
    '---',
    `name: ${name}`,
    'windows:',
    '  - tabs:',
    `      - title: ${WARP_CONFIG_PREFIX}`,
    '        layout:',
    `          cwd: ${JSON.stringify(path)}`,
    '          commands:',
    `            - exec: ${JSON.stringify(command)}`,
    '',
  ].join('\n');

  return {
    kind: 'warp',
    configPath: `${home}/.warp/launch_configurations/${name}.yaml`,
    config,
    url: `warp://launch/${name}`,
  };
}

export function toSessionLaunch(
  terminal: Terminal,
  path: string,
  command: string,
  home: string,
  launchId: string,
): SessionLaunch {
  if (terminal === 'warp') {
    return toWarpLaunch(path, command, home, launchId);
  }

  const line = escapeAppleScriptString(`cd ${quote(path)} && ${command}`);

  if (terminal === 'iterm') {
    return {
      kind: 'applescript',
      script: `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow to write text "${line}"\nend tell`,
    };
  }

  return {
    kind: 'applescript',
    script: `tell application "Terminal"\n  do script "${line}"\n  activate\nend tell`,
  };
}
