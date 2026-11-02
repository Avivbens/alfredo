import { FastAlfred } from 'fast-alfred';
import { dirname, join } from 'node:path';
import { argv } from 'node:process';
import { registerUpdater } from '@alfredo/updater';
import { getCacheDir } from '../common/cache-dir.util';
import { PRELOAD_SCRIPT, PREVIEWS_DIR, THUMBNAILS_DIR } from '../config/constants';
import { PreviewRerunVariablesSchema } from '../models/preview.schema';
import { SettingsSchema } from '../models/settings.schema';
import { pruneCache } from '../services/cache.service';
import { toGifItem } from '../services/gif-item.service';
import { loadGifs } from '../services/gif-loader.service';
import { toIssueItem } from '../services/issue-item.service';
import {
  countPreviewReruns,
  getLocalPreviews,
  getPendingPreviews,
  shouldStartPreload,
  startPreload,
  toPreviewRerun,
} from '../services/preview.service';
import { loadThumbnails } from '../services/thumbnail.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('search-gif'));

  try {
    const settings = alfredClient.env.parse(SettingsSchema);
    const query = alfredClient.input.trim();
    const cacheDir = getCacheDir(alfredClient);
    const thumbnailsDir = join(cacheDir, THUMBNAILS_DIR);
    const previewsDir = join(cacheDir, PREVIEWS_DIR);

    const { gifs, issues } = await loadGifs(alfredClient.cache, { ...settings, query });

    await pruneCache(cacheDir);
    const [thumbnails, previews] = await Promise.all([
      loadThumbnails(gifs, thumbnailsDir),
      getLocalPreviews(gifs, previewsDir),
    ]);

    const pending = getPendingPreviews(gifs, previews);
    const reruns = countPreviewReruns(alfredClient.env.parse(PreviewRerunVariablesSchema), query);
    // Starts once per query, and the downloads run detached, so each rerun shows the previews that have landed.
    if (shouldStartPreload(reruns, pending)) {
      startPreload(join(dirname(argv[1] ?? ''), PRELOAD_SCRIPT), pending);
    }

    alfredClient.output({
      ...toPreviewRerun(query, reruns, pending),
      skipknowledge: true,
      items: [
        ...gifs.map((gif) => toGifItem(gif, { thumbnail: thumbnails.get(gif.id), preview: previews.get(gif.id) })),
        ...issues.map((issue) => toIssueItem(issue, alfredClient.icons)),
      ],
    });
  } catch (error) {
    alfredClient.error(error);
  }
})();
