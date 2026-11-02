import { FastAlfred } from 'fast-alfred';
import { dirname, join } from 'node:path';
import { argv } from 'node:process';
import { registerUpdater } from '@alfredo/updater';
import { getCacheDir } from '../common/cache-dir.util';
import {
  CACHED_FILES_MAX_AGE,
  GIFS_DIR,
  PRELOAD_SCRIPT,
  PREVIEWS_DIR,
  PREVIEWS_MAX_AGE,
  THUMBNAILS_DIR,
} from '../config/constants';
import { PreviewRerunVariablesSchema } from '../models/preview.schema';
import { SettingsSchema } from '../models/settings.schema';
import { pruneOldFiles } from '../services/files.service';
import { toGifItem } from '../services/gif-item.service';
import { loadGifs } from '../services/gif-loader.service';
import { toIssueItem } from '../services/issue-item.service';
import { getLocalPreviews, getPendingPreviews, planPreviewRerun, startPreload } from '../services/preview.service';
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

    await Promise.all([
      pruneOldFiles(thumbnailsDir, CACHED_FILES_MAX_AGE),
      pruneOldFiles(join(cacheDir, GIFS_DIR), CACHED_FILES_MAX_AGE),
      pruneOldFiles(previewsDir, PREVIEWS_MAX_AGE),
    ]);
    const [thumbnails, previews] = await Promise.all([
      loadThumbnails(gifs, thumbnailsDir),
      getLocalPreviews(gifs, previewsDir),
    ]);

    const pending = getPendingPreviews(gifs, previews);
    const { startPreload: shouldPreload, ...rerun } = planPreviewRerun(
      alfredClient.env.parse(PreviewRerunVariablesSchema),
      query,
      pending.length,
    );
    if (shouldPreload) {
      startPreload(join(dirname(argv[1] ?? ''), PRELOAD_SCRIPT), pending);
    }

    alfredClient.output({
      ...rerun,
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
