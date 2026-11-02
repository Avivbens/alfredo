import { FastAlfred } from 'fast-alfred';
import { alfredSchemas } from 'fast-alfred/schemas';
import { join } from 'node:path';
import { getCacheDir } from '../common/cache-dir.util';
import { messageOf } from '../common/error.util';
import { PREVIEWS_DIR } from '../config/constants';
import { PreviewDownloadsSchema } from '../models/preview.schema';
import { loadPreviews } from '../services/preview.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const downloads = alfredSchemas.json(PreviewDownloadsSchema).parse(alfredClient.input);

    await loadPreviews(downloads, join(getCacheDir(alfredClient), PREVIEWS_DIR));
  } catch (error) {
    alfredClient.log(messageOf(error));
  }
})();
