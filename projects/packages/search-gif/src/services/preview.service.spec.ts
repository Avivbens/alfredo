import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRELOAD_CONCURRENCY, PREVIEW_MAX_RERUNS, PREVIEW_RERUN_SECONDS } from '../config/constants';
import type { GiphyGif } from '../models/giphy-gif.schema';
import {
  countPreviewReruns,
  getLocalPreviews,
  getPendingPreviews,
  loadPreviews,
  readPreloadDownloads,
  shouldStartPreload,
  startPreload,
  toPreviewDownload,
  toPreviewRerun,
} from './preview.service';

const { spawnMock, stdinEndMock, stdinOnMock, unrefMock } = vi.hoisted(() => {
  const unrefMock = vi.fn();
  const stdinEndMock = vi.fn();
  const stdinOnMock = vi.fn();
  return {
    unrefMock,
    stdinEndMock,
    stdinOnMock,
    spawnMock: vi.fn(() => ({ unref: unrefMock, stdin: { end: stdinEndMock, on: stdinOnMock } })),
  };
});

vi.mock('node:child_process', () => ({ spawn: spawnMock }));

const PREVIEW_BYTES = Buffer.from('GIF89a-preview');

function toGif(id: string, downsized = true): GiphyGif {
  return {
    id,
    title: `${id} GIF`,
    images: {
      original: { url: `https://media0.giphy.com/media/${id}/giphy.gif` },
      downsized: downsized ? { url: `https://media0.giphy.com/media/${id}/giphy-downsized.gif` } : undefined,
    },
  };
}

const PENDING = [toPreviewDownload(toGif('hope'))];

describe('preview.service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-gif-'));
    fetchMock.mockImplementation(async () => new Response(PREVIEW_BYTES));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  describe('toPreviewDownload', () => {
    it('should preload the downsized rendition Quick Look shows today', () => {
      expect(toPreviewDownload(toGif('hope'))).toEqual({
        id: 'hope',
        url: 'https://media0.giphy.com/media/hope/giphy-downsized.gif',
      });
    });

    it('should fall back to the original when GIPHY sent no downsized rendition', () => {
      expect(toPreviewDownload(toGif('hope', false)).url).toBe('https://media0.giphy.com/media/hope/giphy.gif');
    });
  });

  describe('getLocalPreviews', () => {
    it('should list only the previews already on disk, so ⇧ never opens one still downloading', async () => {
      await writeFile(join(dir, 'hope.gif'), PREVIEW_BYTES);

      expect(await getLocalPreviews([toGif('hope'), toGif('wish')], dir)).toEqual(
        new Map([['hope', join(dir, 'hope.gif')]]),
      );
    });
  });

  describe('getPendingPreviews', () => {
    it('should preload every row in rank order, so the top rows land first', () => {
      const gifs = Array.from({ length: 20 }, (_, index) => toGif(`gif-${index}`));

      expect(getPendingPreviews(gifs, new Map()).map(({ id }) => id)).toEqual(gifs.map(({ id }) => id));
    });

    it('should skip previews already on disk', () => {
      expect(getPendingPreviews([toGif('hope'), toGif('wish')], new Map([['hope', '/previews/hope.gif']]))).toEqual([
        toPreviewDownload(toGif('wish')),
      ]);
    });
  });

  describe('loadPreviews', () => {
    it('should download each preview by GIF id, even when another one fails', async () => {
      fetchMock.mockImplementation(async (url) =>
        String(url).includes('broken') ? new Response('', { status: 500 }) : new Response(PREVIEW_BYTES),
      );

      await loadPreviews([toPreviewDownload(toGif('broken')), toPreviewDownload(toGif('hope'))], dir);

      expect(await readFile(join(dir, 'hope.gif'))).toEqual(PREVIEW_BYTES);
      expect((await getLocalPreviews([toGif('broken')], dir)).size).toBe(0);
    });

    it('should download in rank order a few at a time, so a big search does not flood the connection', async () => {
      let inFlight = 0;
      let peak = 0;
      fetchMock.mockImplementation(async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setImmediate(resolve));
        inFlight -= 1;
        return new Response(PREVIEW_BYTES);
      });
      const downloads = Array.from({ length: 10 }, (_, index) => toPreviewDownload(toGif(`gif-${index}`)));

      await loadPreviews(downloads, dir);

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(downloads.map(({ url }) => url));
      expect(peak).toBe(PRELOAD_CONCURRENCY);
    });
  });

  describe('startPreload', () => {
    it('should run the preload script detached, so it outlives the run Alfred kills on the next keystroke', () => {
      const downloads = [toPreviewDownload(toGif('hope'))];

      startPreload('/workflow/esbuild/preload-previews.js', downloads);

      expect(spawnMock).toHaveBeenCalledWith(process.execPath, ['/workflow/esbuild/preload-previews.js'], {
        detached: true,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
      expect(unrefMock).toHaveBeenCalled();
    });

    it('should hand the downloads over stdin, since an endpoint agent kills node with 4 KB of JSON in its arguments', () => {
      const downloads = Array.from({ length: 20 }, (_, index) => toPreviewDownload(toGif(`gif-${index}`)));

      startPreload('/workflow/esbuild/preload-previews.js', downloads);

      expect(stdinEndMock).toHaveBeenCalledWith(JSON.stringify(downloads));
    });

    it('should absorb a stdin write error, so a preload that dies before reading never crashes the list', () => {
      startPreload('/workflow/esbuild/preload-previews.js', PENDING);

      expect(stdinOnMock).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('readPreloadDownloads', () => {
    it('should parse the downloads startPreload writes to stdin', async () => {
      const downloads = [toPreviewDownload(toGif('hope')), toPreviewDownload(toGif('wish'))];
      const input = Readable.from([JSON.stringify(downloads)]);

      const read = await readPreloadDownloads(input);

      expect(read).toEqual(downloads);
    });

    it('should reject a payload that is not a list of downloads', async () => {
      const input = Readable.from(['{"id":"hope"}']);

      await expect(readPreloadDownloads(input)).rejects.toThrow();
    });
  });

  describe('countPreviewReruns', () => {
    it('should carry the count on while the query stays the same', () => {
      expect(countPreviewReruns({ preview_query: 'hope', preview_reruns: 3 }, 'hope')).toBe(3);
    });

    it('should treat a new query as a first run, whatever count the last query reached', () => {
      expect(countPreviewReruns({ preview_query: 'hope', preview_reruns: 7 }, 'wish')).toBe(0);
    });
  });

  describe('shouldStartPreload', () => {
    it('should not start on the first run, so a pause mid-typing starts no downloads', () => {
      expect(shouldStartPreload(0, PENDING)).toBe(false);
    });

    it('should start on the first rerun, which Alfred skips once the query changes', () => {
      expect(shouldStartPreload(1, PENDING)).toBe(true);
    });

    it('should not start a second preload while previews are still landing', () => {
      expect(shouldStartPreload(3, PENDING)).toBe(false);
    });

    it('should not start with every preview already on disk', () => {
      expect(shouldStartPreload(1, [])).toBe(false);
    });
  });

  describe('toPreviewRerun', () => {
    it('should rerun and count it while previews are still landing', () => {
      expect(toPreviewRerun('hope', 3, PENDING)).toEqual({
        rerun: PREVIEW_RERUN_SECONDS,
        variables: { preview_query: 'hope', preview_reruns: 4 },
      });
    });

    it('should stop rerunning once every preview is on disk', () => {
      expect(toPreviewRerun('hope', 3, [])).toEqual({ variables: { preview_query: 'hope', preview_reruns: 3 } });
    });

    it('should give up after the last rerun, so a preview that never lands cannot keep Alfred busy', () => {
      expect(toPreviewRerun('hope', PREVIEW_MAX_RERUNS, PENDING)).not.toHaveProperty('rerun');
    });
  });
});
