import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRELOAD_CONCURRENCY, PREVIEW_MAX_RERUNS, PREVIEW_RERUN_SECONDS } from '../config/constants';
import type { GiphyGif } from '../models/giphy-gif.schema';
import {
  getLocalPreviews,
  getPendingPreviews,
  loadPreviews,
  planPreviewRerun,
  startPreload,
  toPreviewDownload,
} from './preview.service';

const { spawnMock, unrefMock } = vi.hoisted(() => {
  const unrefMock = vi.fn();
  return { unrefMock, spawnMock: vi.fn(() => ({ unref: unrefMock })) };
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

      expect(spawnMock).toHaveBeenCalledWith(
        process.execPath,
        ['/workflow/esbuild/preload-previews.js', JSON.stringify(downloads)],
        { detached: true, stdio: 'ignore' },
      );
      expect(unrefMock).toHaveBeenCalled();
    });
  });

  describe('planPreviewRerun', () => {
    it('should only schedule a rerun on the first run, so a pause mid-typing starts no downloads', () => {
      expect(planPreviewRerun({ preview_query: '', preview_reruns: 0 }, 'hope', 9)).toEqual({
        startPreload: false,
        rerun: PREVIEW_RERUN_SECONDS,
        variables: { preview_query: 'hope', preview_reruns: 1 },
      });
    });

    it('should start the preload on the first rerun, which Alfred skips once the query changes', () => {
      expect(planPreviewRerun({ preview_query: 'hope', preview_reruns: 1 }, 'hope', 9)).toEqual({
        startPreload: true,
        rerun: PREVIEW_RERUN_SECONDS,
        variables: { preview_query: 'hope', preview_reruns: 2 },
      });
    });

    it('should keep rerunning without a second preload while previews are still landing', () => {
      expect(planPreviewRerun({ preview_query: 'hope', preview_reruns: 3 }, 'hope', 5)).toEqual({
        startPreload: false,
        rerun: PREVIEW_RERUN_SECONDS,
        variables: { preview_query: 'hope', preview_reruns: 4 },
      });
    });

    it('should stop rerunning once every preview is on disk', () => {
      expect(planPreviewRerun({ preview_query: 'hope', preview_reruns: 3 }, 'hope', 0)).not.toHaveProperty('rerun');
    });

    it('should give up after the last rerun, so a preview that never lands cannot keep Alfred busy', () => {
      const plan = planPreviewRerun({ preview_query: 'hope', preview_reruns: PREVIEW_MAX_RERUNS }, 'hope', 5);

      expect(plan).not.toHaveProperty('rerun');
      expect(plan.startPreload).toBe(false);
    });

    it('should treat a new query as a first run, whatever count the last query reached', () => {
      expect(planPreviewRerun({ preview_query: 'hope', preview_reruns: 7 }, 'wish', 9)).toMatchObject({
        startPreload: false,
        variables: { preview_query: 'wish', preview_reruns: 1 },
      });
    });
  });
});
