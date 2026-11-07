import { FastAlfred } from 'fast-alfred';
import { join } from 'node:path';
import { stdin } from 'node:process';
import { getCacheDir } from '../common/cache-dir.util';
import { messageOf } from '../common/error.util';
import { PREVIEWS_DIR } from '../config/constants';
import { loadPreviews, readPreloadDownloads } from '../services/preview.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const downloads = await readPreloadDownloads(stdin);

    await loadPreviews(downloads, join(getCacheDir(alfredClient), PREVIEWS_DIR));
  } catch (error) {
    alfredClient.log(messageOf(error));
  }
})();
