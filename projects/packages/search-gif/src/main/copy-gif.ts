import { FastAlfred } from 'fast-alfred';
import { alfredSchemas } from 'fast-alfred/schemas';
import { join } from 'node:path';
import { getCacheDir } from '../common/cache-dir.util';
import { messageOf } from '../common/error.util';
import { notify } from '../common/notify.util';
import { GIFS_DIR } from '../config/constants';
import { CopyPayloadSchema } from '../models/copy-payload.schema';
import { copyFileToClipboard } from '../services/clipboard.service';
import { getGifFile } from '../services/gif-file.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const payload = alfredSchemas.json(CopyPayloadSchema).parse(alfredClient.input);
    const path = await getGifFile(payload, join(getCacheDir(alfredClient), GIFS_DIR));

    await copyFileToClipboard(path);
  } catch (error) {
    alfredClient.log(messageOf(error));
    notify(`⚠️ ${messageOf(error)}`);
  }
})();
