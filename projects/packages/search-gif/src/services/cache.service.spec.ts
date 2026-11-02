import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GIFS_DIR, PREVIEWS_DIR, THUMBNAILS_DIR } from '../config/constants';
import { pruneCache } from './cache.service';

const GIF_BYTES = Buffer.from('GIF89a');
const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

describe('cache.service', () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'search-gif-'));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  describe('pruneCache', () => {
    it('should remove thumbnails and GIFs older than a week', async () => {
      await writeAgedFile(join(cacheDir, THUMBNAILS_DIR, 'old.gif'), 8 * DAY_SECONDS);
      await writeAgedFile(join(cacheDir, GIFS_DIR, 'old.gif'), 8 * DAY_SECONDS);
      await writeAgedFile(join(cacheDir, GIFS_DIR, 'fresh.gif'), 6 * DAY_SECONDS);

      await pruneCache(cacheDir);

      expect(await readdir(join(cacheDir, THUMBNAILS_DIR))).toEqual([]);
      expect(await readdir(join(cacheDir, GIFS_DIR))).toEqual(['fresh.gif']);
    });

    it('should remove previews older than an hour, since they expire with their search', async () => {
      await writeAgedFile(join(cacheDir, PREVIEWS_DIR, 'old.gif'), 2 * HOUR_SECONDS);
      await writeAgedFile(join(cacheDir, PREVIEWS_DIR, 'fresh.gif'), 0);

      await pruneCache(cacheDir);

      expect(await readdir(join(cacheDir, PREVIEWS_DIR))).toEqual(['fresh.gif']);
    });
  });
});

async function writeAgedFile(path: string, ageSeconds: number): Promise<void> {
  const time = Date.now() / 1000 - ageSeconds;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, GIF_BYTES);
  await utimes(path, time, time);
}
