import type { FastAlfredConfig } from 'fast-alfred';
import { basename, join } from 'node:path';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NATIVE_ADDON_PATH } from './constants';

/** Nx and Vitest run specs from the project folder */
const CONFIG_PATH = join(cwd(), '.fast-alfred.config.cjs');

/** The config places its output by the Nx project name, which only an Nx run sets */
async function loadBundlerOptions(): Promise<NonNullable<FastAlfredConfig['bundlerOptions']>> {
  vi.stubEnv('NX_TASK_TARGET_PROJECT', 'engage-contact');
  const { default: config }: { default: FastAlfredConfig } = await import(CONFIG_PATH);

  return config.bundlerOptions ?? {};
}

describe('constants', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('NATIVE_ADDON_PATH', () => {
    it('should match where the build packs the contacts addon, since fast-alfred zips the target folder from its parent', async () => {
      const { targetDir = '', assetsDir = '', assets = [] } = await loadBundlerOptions();
      const addon = assets.find((asset) => asset.endsWith('.node')) ?? '';

      const packedPath = join(basename(targetDir), assetsDir, basename(addon));

      expect(packedPath).toBe(NATIVE_ADDON_PATH);
    });
  });
});
