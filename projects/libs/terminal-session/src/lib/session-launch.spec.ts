import { minutesToMilliseconds } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { quote } from '@alfredo/command-injection';
import { isStaleWarpConfig, toSessionLaunch } from './session-launch';

const TEN_MINUTES = minutesToMilliseconds(10);

describe('isStaleWarpConfig', () => {
  const NOW = Date.parse('2026-11-03T10:00:00Z');

  it.each([
    ['alfredo-session-abc.yaml', NOW - TEN_MINUTES - 1, true],
    ['alfredo-session-abc.yaml', NOW - TEN_MINUTES + 1, false],
    ['alfredo-session.yaml', NOW - TEN_MINUTES - 1, true],
    ['my-dev-layout.yaml', NOW - TEN_MINUTES * 100, false],
    ['alfredo-session-abc.yml', NOW - TEN_MINUTES * 100, false],
  ])('should treat %s modified at %d as stale: %s', (fileName, mtimeMs, expected) => {
    expect(isStaleWarpConfig(fileName, mtimeMs, NOW)).toBe(expected);
  });
});

describe('toSessionLaunch', () => {
  it('should cd into a quoted path before the command in Terminal', () => {
    const launch = toSessionLaunch('native', '/tmp/my repo@x', 'claude', '/Users/me', 'abc');

    expect(launch).toEqual({
      kind: 'applescript',
      script: `tell application "Terminal"\n  do script "cd $'/tmp/my repo@x' && claude"\n  activate\nend tell`,
    });
  });

  it('should open a new iTerm window and write the line', () => {
    const launch = toSessionLaunch('iterm', '/tmp/repo', 'claude', '/Users/me', 'abc');

    expect(launch).toEqual({
      kind: 'applescript',
      script: `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow to write text "cd /tmp/repo && claude"\nend tell`,
    });
  });

  it('should write the Warp config under a name of its own, so launches from other workflows never overwrite it', () => {
    const launch = toSessionLaunch('warp', '/tmp/my repo@x', 'claude', '/Users/me', 'abc');

    expect(launch).toEqual({
      kind: 'warp',
      configPath: '/Users/me/.warp/launch_configurations/alfredo-session-abc.yaml',
      url: 'warp://launch/alfredo-session-abc',
      config: [
        '---',
        'name: alfredo-session-abc',
        'windows:',
        '  - tabs:',
        '      - title: alfredo-session',
        '        layout:',
        '          cwd: "/tmp/my repo@x"',
        '          commands:',
        '            - exec: "claude"',
        '',
      ].join('\n'),
    });
  });

  describe('with a folder name built to break out', () => {
    /** Command substitution, a backtick pair, both quotes and a backslash: everything a path could escape with. */
    const HOSTILE_PATH = String.raw`/tmp/$(touch x)` + '`id`' + String.raw`"\'`;
    /** The shell word is one ANSI-C quoted string, then every backslash and quote is escaped again for AppleScript. */
    const HOSTILE_LINE = String.raw`cd $'/tmp/$(touch x)` + '`id`' + String.raw`\\\"\\\\\\'' && claude`;

    function readAppleScriptString(script: string, prefix: string): string | undefined {
      const literal = script.split(prefix)[1]?.match(/^((?:[^"\\]|\\.)*)"/)?.[1];

      return literal?.replace(/\\(.)/g, '$1');
    }

    function readShellWord(line: string): string | undefined {
      const word = line.match(/^cd \$'((?:[^'\\]|\\.)*)' && claude$/)?.[1];

      return word?.replace(/\\(.)/g, '$1');
    }

    it.each([
      ['native', `tell application "Terminal"\n  do script "${HOSTILE_LINE}"\n  activate\nend tell`, 'do script "'],
      [
        'iterm',
        `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow to write text "${HOSTILE_LINE}"\nend tell`,
        'write text "',
      ],
    ] as const)('should keep the path inside one quoted word in the %s AppleScript', (terminal, script, prefix) => {
      const launch = toSessionLaunch(terminal, HOSTILE_PATH, 'claude', '/Users/me', 'abc');
      const line = launch.kind === 'applescript' ? readAppleScriptString(launch.script, prefix) : undefined;

      expect(launch).toEqual({ kind: 'applescript', script });
      expect(line).toBe(`cd ${quote(HOSTILE_PATH)} && claude`);
      expect(readShellWord(line ?? '')).toBe(HOSTILE_PATH);
    });

    it('should keep the path a single JSON string in the Warp config', () => {
      const launch = toSessionLaunch('warp', HOSTILE_PATH, 'claude', '/Users/me', 'abc');
      const config = launch.kind === 'warp' ? launch.config : '';

      expect(config).toBe(
        [
          '---',
          'name: alfredo-session-abc',
          'windows:',
          '  - tabs:',
          '      - title: alfredo-session',
          '        layout:',
          String.raw`          cwd: "/tmp/$(touch x)` + '`id`' + String.raw`\"\\'"`,
          '          commands:',
          '            - exec: "claude"',
          '',
        ].join('\n'),
      );
      expect(JSON.parse(config.match(/^ {10}cwd: (.*)$/m)?.[1] ?? '')).toBe(HOSTILE_PATH);
    });
  });
});
