import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GiphyGif } from '../models/giphy-gif.schema';
import { loadThumbnails } from './thumbnail.service';

const STILL_BYTES = Buffer.from('GIF89a-still');

function toGif(id: string, stillUrl?: string): GiphyGif {
  return {
    id,
    title: `${id} GIF`,
    images: {
      original: { url: `https://media0.giphy.com/media/${id}/giphy.gif` },
      fixed_width_small_still: stillUrl ? { url: stillUrl } : undefined,
    },
  };
}

describe('thumbnail.service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-gif-'));
    fetchMock.mockImplementation(async () => new Response(STILL_BYTES));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  describe('loadThumbnails', () => {
    it('should download each still and map it by GIF id', async () => {
      const thumbnails = await loadThumbnails([toGif('hope', 'https://media0.giphy.com/hope/100w_s.gif')], dir);

      expect(thumbnails).toEqual(new Map([['hope', join(dir, 'hope.gif')]]));
      expect(await readFile(join(dir, 'hope.gif'))).toEqual(STILL_BYTES);
    });

    it('should reuse a still downloaded by an earlier search', async () => {
      await writeFile(join(dir, 'hope.gif'), STILL_BYTES);

      const thumbnails = await loadThumbnails([toGif('hope', 'https://media0.giphy.com/hope/100w_s.gif')], dir);

      expect(thumbnails.get('hope')).toBe(join(dir, 'hope.gif'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should leave out a GIF whose still fails, so only its row falls back to the workflow icon', async () => {
      fetchMock.mockImplementation(async (url) =>
        String(url).includes('broken') ? new Response('', { status: 500 }) : new Response(STILL_BYTES),
      );

      const thumbnails = await loadThumbnails(
        [
          toGif('broken', 'https://media0.giphy.com/broken/100w_s.gif'),
          toGif('hope', 'https://media0.giphy.com/hope/100w_s.gif'),
        ],
        dir,
      );

      expect([...thumbnails.keys()]).toEqual(['hope']);
    });

    it('should leave out a GIF that has no still', async () => {
      expect(await loadThumbnails([toGif('hope')], dir)).toEqual(new Map());
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
