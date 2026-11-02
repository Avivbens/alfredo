import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, isFile, pruneOldFiles } from './files.service';

const GIF_BYTES = Buffer.from('GIF89a');
const DAY_SECONDS = 24 * 60 * 60;

describe('files.service', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-gif-'));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  describe('downloadFile', () => {
    it('should write the body into a folder that does not exist yet', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () => new Response(GIF_BYTES)),
      );
      const path = join(dir, 'thumbnails', 'hope.gif');

      await downloadFile('https://media0.giphy.com/hope.gif', path);

      expect(await readFile(path)).toEqual(GIF_BYTES);
    });

    it('should leave only the finished file behind, with no temp file next to it', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () => new Response(GIF_BYTES)),
      );

      await downloadFile('https://media0.giphy.com/hope.gif', join(dir, 'hope.gif'));

      expect(await readdir(dir)).toEqual(['hope.gif']);
    });

    it('should throw on a failed response instead of writing its error page', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () => new Response('Not Found', { status: 404 })),
      );
      const path = join(dir, 'hope.gif');

      await expect(downloadFile('https://media0.giphy.com/hope.gif', path)).rejects.toThrow('HTTP 404');
      expect(await isFile(path)).toBe(false);
    });
  });

  describe('pruneOldFiles', () => {
    it('should remove only files older than the max age', async () => {
      const now = Date.now() / 1000;
      await writeFile(join(dir, 'old.gif'), GIF_BYTES);
      await writeFile(join(dir, 'fresh.gif'), GIF_BYTES);
      await utimes(join(dir, 'old.gif'), now - 8 * DAY_SECONDS, now - 8 * DAY_SECONDS);

      await pruneOldFiles(dir, 7 * DAY_SECONDS * 1000);

      expect(await readdir(dir)).toEqual(['fresh.gif']);
    });

    it('should not throw for a folder that was never created', async () => {
      await expect(pruneOldFiles(join(dir, 'missing'), 0)).resolves.toBeUndefined();
    });
  });
});
