import type { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { messageOf } from '../common/error.util';
import { CACHE_LAST_SEARCH_KEY, SEARCH_CACHE_TTL, SEARCH_DEBOUNCE_MS } from '../config/constants';
import type { GifIssue } from '../models/gif-issue.schema';
import { type GiphyGif, LastSearchSchema } from '../models/giphy-gif.schema';
import { GiphyRequestError } from '../models/giphy-request-error.model';
import { type SearchParams, searchGifs } from './giphy-api.service';

type Cache = FastAlfred['cache'];

interface LoadedGifs {
  gifs: GiphyGif[];
  issues: GifIssue[];
}

/** Never throws, so a missing key or GIPHY's rate limit shows up as a row explaining it rather than as an error. */
export async function loadGifs(cache: Cache, params: SearchParams): Promise<LoadedGifs> {
  const { apiKey, query } = params;
  if (!query) {
    return { gifs: [], issues: [{ kind: 'empty-query' }] };
  }

  if (!apiKey) {
    return { gifs: [], issues: [{ kind: 'missing-api-key' }] };
  }

  try {
    const gifs = await getGifs(cache, params);
    if (!gifs.length) {
      return { gifs, issues: [{ kind: 'no-results', query }] };
    }

    return { gifs, issues: [] };
  } catch (error) {
    return { gifs: [], issues: [toRequestIssue(error)] };
  }
}

/** Only the last search is kept, since fast-alfred drops an expired key only when that key is read again. */
async function getGifs(cache: Cache, params: SearchParams): Promise<GiphyGif[]> {
  const key = toSearchKey(params);

  const lastSearch = LastSearchSchema.safeParse(cache.get(CACHE_LAST_SEARCH_KEY));
  if (lastSearch.success && lastSearch.data.key === key) {
    return lastSearch.data.gifs;
  }

  await setTimeout(SEARCH_DEBOUNCE_MS);

  const gifs = await searchGifs(params);
  cache.setWithTTL(CACHE_LAST_SEARCH_KEY, { key, gifs }, { maxAge: SEARCH_CACHE_TTL });

  return gifs;
}

function toSearchKey({ query, resultsLimit, rating }: SearchParams): string {
  return [rating, resultsLimit, query].join(':');
}

function toRequestIssue(error: unknown): GifIssue {
  if (error instanceof GiphyRequestError && [401, 403].includes(error.status)) {
    return { kind: 'invalid-api-key' };
  }

  if (error instanceof GiphyRequestError && error.status === 429) {
    return { kind: 'rate-limited' };
  }

  return { kind: 'request-failed', message: messageOf(error) };
}
