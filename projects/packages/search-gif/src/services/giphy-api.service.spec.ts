import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GiphyRequestError } from '../models/giphy-request-error.model';
import { type SearchParams, searchGifs } from './giphy-api.service';

const PARAMS: SearchParams = { apiKey: 'beta-key', query: 'hope', resultsLimit: 20, rating: 'pg-13' };

const ORIGINAL_URL = 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif?cid=790b7611&rid=giphy.gif&ct=g';
const DOWNSIZED_URL =
  'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy-downsized.gif?cid=790b7611&rid=giphy-downsized.gif&ct=g';
const STILL_URL = 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/100w_s.gif?cid=790b7611&rid=100w_s.gif&ct=g';

/** Shaped like a GIPHY `/v1/gifs/search` response (developers.giphy.com/docs/api/schema), trimmed to one result */
const SEARCH_RESPONSE = {
  data: [
    {
      type: 'gif',
      id: '3o7TKSjRrfIPjeiVyM',
      url: 'https://giphy.com/gifs/hope-3o7TKSjRrfIPjeiVyM',
      rating: 'g',
      title: 'Hope GIF by Hello All',
      images: {
        original: { url: ORIGINAL_URL, width: '480', height: '270', size: '1534210' },
        downsized: { url: DOWNSIZED_URL, width: '480', height: '270', size: '1534210' },
        fixed_width_small_still: { url: STILL_URL, width: '100', height: '56' },
        fixed_height: { url: ORIGINAL_URL, width: '356', height: '200' },
      },
    },
  ],
  pagination: { total_count: 2140, count: 1, offset: 0 },
  meta: { status: 200, msg: 'OK', response_id: 'a1b2c3d4' },
};

function toJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('giphy-api.service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => toJsonResponse(SEARCH_RESPONSE, 200));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchGifs', () => {
    it('should send the key, query, limit and rating to the search endpoint', async () => {
      await searchGifs(PARAMS);

      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.origin + url.pathname).toBe('https://api.giphy.com/v1/gifs/search');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        api_key: 'beta-key',
        q: 'hope',
        limit: '20',
        rating: 'pg-13',
      });
    });

    it('should keep only the fields the workflow reads', async () => {
      expect(await searchGifs(PARAMS)).toEqual([
        {
          id: '3o7TKSjRrfIPjeiVyM',
          title: 'Hope GIF by Hello All',
          images: {
            original: { url: ORIGINAL_URL },
            downsized: { url: DOWNSIZED_URL },
            fixed_width_small_still: { url: STILL_URL },
          },
        },
      ]);
    });

    it('should drop a rendition GIPHY sent without a URL, since one such result failed a whole "angry ball" search', async () => {
      const [gif] = SEARCH_RESPONSE.data;
      const brokenRendition = { ...gif, images: { ...gif?.images, downsized: { width: '0', height: '0', size: '0' } } };
      fetchMock.mockResolvedValue(toJsonResponse({ ...SEARCH_RESPONSE, data: [brokenRendition] }, 200));

      const [parsed] = await searchGifs(PARAMS);

      expect(parsed?.images.downsized).toBeUndefined();
      expect(parsed?.images.original).toEqual({ url: ORIGINAL_URL });
    });

    it('should drop a GIF it cannot use instead of failing the rest of the results', async () => {
      const unusable = { type: 'gif', id: 'no-original', title: 'Broken GIF', images: {} };
      fetchMock.mockResolvedValue(
        toJsonResponse({ ...SEARCH_RESPONSE, data: [unusable, ...SEARCH_RESPONSE.data] }, 200),
      );

      expect((await searchGifs(PARAMS)).map(({ id }) => id)).toEqual(['3o7TKSjRrfIPjeiVyM']);
    });

    it('should carry the HTTP status, so a rejected key can be told apart from other failures', async () => {
      fetchMock.mockResolvedValue(toJsonResponse({ data: [], meta: { status: 401, msg: 'Unauthorized' } }, 401));

      const request = searchGifs(PARAMS);

      await expect(request).rejects.toBeInstanceOf(GiphyRequestError);
      await expect(request).rejects.toMatchObject({ status: 401 });
    });
  });
});
