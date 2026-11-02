import { join } from 'node:path';
import type { GiphyGif } from '../models/giphy-gif.schema';
import { downloadFile, isFile } from './files.service';

/**
 * Alfred only shows icons from local files, so each still is downloaded once and reused by GIF id.
 * A GIF whose still fails to load is left out, and its row falls back to the workflow icon.
 */
export async function loadThumbnails(gifs: GiphyGif[], dir: string): Promise<Map<string, string>> {
  const results = await Promise.allSettled(gifs.map((gif) => getThumbnail(gif, dir)));

  return new Map(
    results
      .filter((result): result is PromiseFulfilledResult<[string, string]> => result.status === 'fulfilled')
      .map(({ value }) => value),
  );
}

async function getThumbnail({ id, images }: GiphyGif, dir: string): Promise<[string, string]> {
  const path = join(dir, `${id}.gif`);
  if (await isFile(path)) {
    return [id, path];
  }

  const url = images.fixed_width_small_still?.url;
  if (!url) {
    throw new Error(`GIF ${id} has no still to show`);
  }

  await downloadFile(url, path);
  return [id, path];
}
