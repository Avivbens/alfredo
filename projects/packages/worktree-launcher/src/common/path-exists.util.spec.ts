import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPathReachable, isPathTaken } from './path-exists.util';

describe('path-exists.util', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'path-exists-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('isPathTaken', () => {
    it('should count a dangling symlink as taken, so a new worktree never lands on it', async () => {
      await symlink(join(root, 'missing'), join(root, 'link'));

      expect(await isPathTaken(join(root, 'link'))).toBe(true);
      expect(await isPathTaken(join(root, 'free'))).toBe(false);
    });
  });

  describe('isPathReachable', () => {
    it('should follow symlinks, so a lockfile that links nowhere does not count', async () => {
      await writeFile(join(root, 'pnpm-lock.yaml'), '');
      await symlink(join(root, 'missing'), join(root, 'yarn.lock'));

      expect(await isPathReachable(join(root, 'pnpm-lock.yaml'))).toBe(true);
      expect(await isPathReachable(join(root, 'yarn.lock'))).toBe(false);
    });
  });
});
