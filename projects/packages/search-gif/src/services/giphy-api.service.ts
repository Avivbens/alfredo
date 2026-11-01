import { GIPHY_SEARCH_URL } from '../config/constants';
import { type GiphyGif, GiphySearchResponseSchema } from '../models/giphy-gif.schema';
import { GiphyRequestError } from '../models/giphy-request-error.model';
import type { Settings } from '../models/settings.schema';

export type SearchParams = Settings & { query: string };

export async function searchGifs({ apiKey, query, resultsLimit, rating }: SearchParams): Promise<GiphyGif[]> {
  const params = new URLSearchParams({ api_key: apiKey, q: query, limit: String(resultsLimit), rating });
  const response = await fetch(`${GIPHY_SEARCH_URL}?${params}`);

  if (!response.ok) {
    throw new GiphyRequestError(response.status, `GIPHY search failed with HTTP ${response.status}`);
  }

  return GiphySearchResponseSchema.parse(await response.json()).data;
}
