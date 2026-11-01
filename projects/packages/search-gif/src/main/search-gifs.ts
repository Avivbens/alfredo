import { FastAlfred } from 'fast-alfred';
import { join } from 'node:path';
import { registerUpdater } from '@alfredo/updater';
import { getCacheDir } from '../common/cache-dir.util';
import { THUMBNAILS_DIR } from '../config/constants';
import { SettingsSchema } from '../models/settings.schema';
import { pruneCache } from '../services/cache.service';
import { toGifItem } from '../services/gif-item.service';
import { loadGifs } from '../services/gif-loader.service';
import { toIssueItem } from '../services/issue-item.service';
import { loadThumbnails } from '../services/thumbnail.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('search-gif'));

  try {
    const settings = alfredClient.env.parse(SettingsSchema);
    const cacheDir = getCacheDir(alfredClient);
    const thumbnailsDir = join(cacheDir, THUMBNAILS_DIR);

    const { gifs, issues } = await loadGifs(alfredClient.cache, { ...settings, query: alfredClient.input.trim() });

    await pruneCache(cacheDir);
    const thumbnails = await loadThumbnails(gifs, thumbnailsDir);

    alfredClient.output({
      items: [
        ...gifs.map((gif) => toGifItem(gif, thumbnails.get(gif.id))),
        ...issues.map((issue) => toIssueItem(issue, alfredClient.icons)),
      ],
    });
  } catch (error) {
    alfredClient.error(error);
  }
})();
