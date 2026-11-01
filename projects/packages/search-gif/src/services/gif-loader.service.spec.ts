import type { FastAlfred } from 'fast-alfred';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_LAST_SEARCH_KEY, SEARCH_CACHE_TTL } from '../config/constants';
import type { GiphyGif } from '../models/giphy-gif.schema';
import { GiphyRequestError } from '../models/giphy-request-error.model';
import { loadGifs } from './gif-loader.service';
import { type SearchParams, searchGifs } from './giphy-api.service';

vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));
vi.mock('./giphy-api.service', () => ({ searchGifs: vi.fn() }));

const PARAMS: SearchParams = { apiKey: 'beta-key', query: 'hope', resultsLimit: 20, rating: 'pg-13' };

const HOPE_GIF: GiphyGif = {
  id: '3o7TKSjRrfIPjeiVyM',
  title: 'Hope GIF by Hello All',
  images: { original: { url: 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' } },
};

describe('gif-loader.service', () => {
  const cache = { get: vi.fn(), setWithTTL: vi.fn() };
  const alfredCache = cache as unknown as FastAlfred['cache'];

  beforeEach(() => {
    cache.get.mockReturnValue(null);
    vi.mocked(searchGifs).mockResolvedValue([HOPE_GIF]);
  });

  describe('loadGifs', () => {
    it('should list the GIFs GIPHY found and report nothing', async () => {
      expect(await loadGifs(alfredCache, PARAMS)).toEqual({ gifs: [HOPE_GIF], issues: [] });
    });

    it('should remember the search, so reopening it spends no beta call', async () => {
      await loadGifs(alfredCache, PARAMS);

      expect(cache.setWithTTL).toHaveBeenCalledWith(
        CACHE_LAST_SEARCH_KEY,
        { key: 'pg-13:20:hope', gifs: [HOPE_GIF] },
        { maxAge: SEARCH_CACHE_TTL },
      );
    });

    it('should serve the same search from the cache without calling GIPHY', async () => {
      cache.get.mockReturnValue({ key: 'pg-13:20:hope', gifs: [HOPE_GIF] });

      expect(await loadGifs(alfredCache, PARAMS)).toEqual({ gifs: [HOPE_GIF], issues: [] });
      expect(searchGifs).not.toHaveBeenCalled();
    });

    it('should search again when the cached search was for another rating', async () => {
      cache.get.mockReturnValue({ key: 'g:20:hope', gifs: [] });

      await loadGifs(alfredCache, PARAMS);

      expect(searchGifs).toHaveBeenCalledWith(PARAMS);
    });

    it('should hint at typing before spending a call on an empty query', async () => {
      expect(await loadGifs(alfredCache, { ...PARAMS, query: '' })).toEqual({
        gifs: [],
        issues: [{ kind: 'empty-query' }],
      });
      expect(searchGifs).not.toHaveBeenCalled();
    });

    it('should ask for a key instead of calling GIPHY without one', async () => {
      expect(await loadGifs(alfredCache, { ...PARAMS, apiKey: '' })).toEqual({
        gifs: [],
        issues: [{ kind: 'missing-api-key' }],
      });
      expect(searchGifs).not.toHaveBeenCalled();
    });

    it('should report a search with no results', async () => {
      vi.mocked(searchGifs).mockResolvedValue([]);

      expect(await loadGifs(alfredCache, PARAMS)).toEqual({
        gifs: [],
        issues: [{ kind: 'no-results', query: 'hope' }],
      });
    });

    it.each([401, 403])('should report a rejected key on HTTP %i', async (status) => {
      vi.mocked(searchGifs).mockRejectedValue(new GiphyRequestError(status, 'rejected'));

      expect(await loadGifs(alfredCache, PARAMS)).toEqual({ gifs: [], issues: [{ kind: 'invalid-api-key' }] });
    });

    it('should report the beta rate limit on HTTP 429', async () => {
      vi.mocked(searchGifs).mockRejectedValue(new GiphyRequestError(429, 'Too Many Requests'));

      expect(await loadGifs(alfredCache, PARAMS)).toEqual({ gifs: [], issues: [{ kind: 'rate-limited' }] });
    });

    it('should turn any other failure into an issue instead of throwing', async () => {
      vi.mocked(searchGifs).mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.giphy.com'));

      expect(await loadGifs(alfredCache, PARAMS)).toEqual({
        gifs: [],
        issues: [{ kind: 'request-failed', message: 'getaddrinfo ENOTFOUND api.giphy.com' }],
      });
    });
  });
});
