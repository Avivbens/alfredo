import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CopyPayload } from '../models/copy-payload.schema';
import { getGifFile } from './gif-file.service';

const GIF_BYTES = Buffer.from('GIF89a-original');

const PAYLOAD: CopyPayload = {
  id: '3o7TKSjRrfIPjeiVyM',
  url: 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
};

describe('gif-file.service', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'search-gif-'));
    fetchMock.mockImplementation(async () => new Response(GIF_BYTES));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  describe('getGifFile', () => {
    it('should download the GIF into the folder, named by its id', async () => {
      const path = await getGifFile(PAYLOAD, dir);

      expect(path).toBe(join(dir, '3o7TKSjRrfIPjeiVyM.gif'));
      expect(await readFile(path)).toEqual(GIF_BYTES);
      expect(fetchMock).toHaveBeenCalledWith(PAYLOAD.url);
    });

    it('should reuse a GIF copied before instead of downloading it again', async () => {
      await writeFile(join(dir, '3o7TKSjRrfIPjeiVyM.gif'), GIF_BYTES);

      expect(await getGifFile(PAYLOAD, dir)).toBe(join(dir, '3o7TKSjRrfIPjeiVyM.gif'));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
