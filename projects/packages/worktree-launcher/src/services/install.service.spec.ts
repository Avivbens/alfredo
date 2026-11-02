import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quote } from '@alfredo/command-injection';
import { detectInstallCommand, runInstallInBackground } from './install.service';

const { spawn, access } = vi.hoisted(() => ({ spawn: vi.fn(), access: vi.fn() }));

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  spawn,
}));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  access,
}));

function mockLockfiles(present: string[]): void {
  access.mockImplementation(async (file: string) => {
    if (!present.some((name) => file.endsWith(`/${name}`))) {
      throw new Error('ENOENT');
    }
  });
}

describe('install.service', () => {
  beforeEach(() => {
    spawn.mockReset();
    access.mockReset();
  });

  describe('detectInstallCommand', () => {
    it('should pick pnpm for pnpm-lock.yaml', async () => {
      mockLockfiles(['pnpm-lock.yaml']);

      expect(await detectInstallCommand('/work/app')).toBe('pnpm install');
    });

    it('should return null without a lockfile', async () => {
      mockLockfiles([]);

      expect(await detectInstallCommand('/work/app')).toBeNull();
    });

    it('should pick the lockfile in the documented order when several exist', async () => {
      mockLockfiles(['bun.lock', 'package-lock.json', 'yarn.lock']);
      expect(await detectInstallCommand('/work/app')).toBe('yarn install');

      mockLockfiles(['bun.lockb', 'package-lock.json']);
      expect(await detectInstallCommand('/work/app')).toBe('npm install');

      mockLockfiles(['bun.lockb']);
      expect(await detectInstallCommand('/work/app')).toBe('bun install');
    });
  });

  describe('runInstallInBackground', () => {
    it('should spawn detached through an interactive login shell with a quoted path', () => {
      const unref = vi.fn();
      spawn.mockReturnValue({ unref });

      runInstallInBackground('/work/my app', 'pnpm install');

      const [file, args, options] = spawn.mock.calls[0] ?? [];
      expect(file).toBe(process.env.SHELL ?? '/bin/zsh');
      expect(args[0]).toBe('-ilc');
      expect(args[1]).toContain(`cd ${quote('/work/my app')} && pnpm install;`);
      expect(options).toEqual({ detached: true, stdio: 'ignore' });
      expect(unref).toHaveBeenCalledOnce();
    });

    it('should quote a folder name containing a double quote and a space', () => {
      spawn.mockReturnValue({ unref: vi.fn() });
      const path = '/work/my "app"';

      runInstallInBackground(path, 'npm install');

      const script: string = spawn.mock.calls[0]?.[1][1];
      expect(script).toContain(`cd ${quote(path)} &&`);
      expect(script).toContain(`message=${quote('Dependencies installed in my "app"')};`);
      expect(script).toContain(`message=${quote('Install failed in my "app"')};`);
      expect(script).toContain("-e 'display notification (item 1 of argv) with title (item 2 of argv)'");
      expect(script).toContain('"$message"');
      expect(script).not.toContain('display notification "');
    });
  });

  describe('generated script', () => {
    const run = promisify(execFile);
    const shells = ['bash', 'zsh'];
    let root: string;

    beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'install-script-'));
    });

    afterEach(async () => {
      await rm(root, { recursive: true, force: true });
    });

    async function runScript(shell: string, command: string): Promise<string[]> {
      const bin = join(root, 'bin');
      await mkdir(bin, { recursive: true });
      await writeFile(join(bin, 'osascript'), '#!/bin/sh\nfor arg in "$@"; do printf "%s\\n" "$arg"; done\n');
      await chmod(join(bin, 'osascript'), 0o755);

      const folder = join(root, 'a"b\'c $HOME `touch MARK` d');
      await mkdir(folder);
      spawn.mockReturnValue({ unref: vi.fn() });
      runInstallInBackground(folder, command);
      const script: string = spawn.mock.calls.at(-1)?.[1][1];

      const { stdout } = await run(shell, ['-c', script], {
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        cwd: root,
      });
      expect(existsSync(join(root, 'MARK'))).toBe(false);
      expect(existsSync(join(folder, 'MARK'))).toBe(false);

      return stdout.split('\n').slice(-3, -1);
    }

    for (const shell of shells) {
      const available = shell === 'bash' || existsSync('/bin/zsh');

      it.skipIf(!available)(`should notify success through ${shell} with the exact message and title`, async () => {
        expect(await runScript(shell, 'true')).toEqual([
          'Dependencies installed in a"b\'c $HOME `touch MARK` d',
          'Worktree Launcher',
        ]);
      });

      it.skipIf(!available)(`should notify failure through ${shell} with the exact message and title`, async () => {
        expect(await runScript(shell, 'false')).toEqual([
          'Install failed in a"b\'c $HOME `touch MARK` d',
          'Worktree Launcher',
        ]);
      });
    }
  });
});
