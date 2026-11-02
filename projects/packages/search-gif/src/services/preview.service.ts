import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { PRELOAD_CONCURRENCY, PREVIEW_MAX_RERUNS, PREVIEW_RERUN_SECONDS } from '../config/constants';
import type { GiphyGif } from '../models/giphy-gif.schema';
import type { PreviewDownload, PreviewRerunVariables } from '../models/preview.schema';
import { downloadFile, isFile } from './files.service';

interface PreviewRerunPlan {
  startPreload: boolean;
  rerun?: number;
  variables: PreviewRerunVariables;
}

export function toPreviewDownload({ id, images }: GiphyGif): PreviewDownload {
  return { id, url: images.downsized?.url ?? images.original.url };
}

export async function getLocalPreviews(gifs: GiphyGif[], dir: string): Promise<Map<string, string>> {
  const previews = await Promise.all(
    gifs.map(async ({ id }) => {
      const path = toPreviewPath(dir, id);
      return (await isFile(path)) ? ([id, path] as const) : undefined;
    }),
  );

  return new Map(previews.filter((preview): preview is readonly [string, string] => !!preview));
}

export function getPendingPreviews(gifs: GiphyGif[], localPreviews: Map<string, string>): PreviewDownload[] {
  return gifs.filter(({ id }) => !localPreviews.has(id)).map(toPreviewDownload);
}

/** A few workers drain the queue in rank order, so the top rows land first and a big search does not flood the connection. */
export async function loadPreviews(downloads: PreviewDownload[], dir: string): Promise<void> {
  const queue = [...downloads];

  await Promise.all(Array.from({ length: PRELOAD_CONCURRENCY }, () => downloadNext(queue, dir)));
}

/** Detached, so the downloads outlive this run - Alfred kills the list's script on the next keystroke. */
export function startPreload(script: string, downloads: PreviewDownload[]): void {
  spawn(process.execPath, [script, JSON.stringify(downloads)], { detached: true, stdio: 'ignore' }).unref();
}

/**
 * The first run only schedules a rerun, and Alfred skips a rerun once the query changes,
 * so the preload starts only for a query the user stayed on, never for a pause mid-typing.
 */
export function planPreviewRerun(
  { preview_query, preview_reruns }: PreviewRerunVariables,
  query: string,
  pending: number,
): PreviewRerunPlan {
  const reruns = preview_query === query ? preview_reruns : 0;
  if (!pending || reruns >= PREVIEW_MAX_RERUNS) {
    return { startPreload: false, variables: { preview_query: query, preview_reruns: reruns } };
  }

  return {
    startPreload: reruns === 1,
    rerun: PREVIEW_RERUN_SECONDS,
    variables: { preview_query: query, preview_reruns: reruns + 1 },
  };
}

async function downloadNext(queue: PreviewDownload[], dir: string): Promise<void> {
  const next = queue.shift();
  if (!next) {
    return;
  }

  try {
    await downloadFile(next.url, toPreviewPath(dir, next.id));
  } catch {
    // A preview that fails to download keeps its web link.
  }

  await downloadNext(queue, dir);
}

export function toPreviewPath(dir: string, id: string): string {
  return join(dir, `${id}.gif`);
}
