import { join } from 'node:path';
import { CACHED_FILES_MAX_AGE, GIFS_DIR, THUMBNAILS_DIR } from '../config/constants';
import { pruneOldFiles } from './files.service';

export async function pruneCache(cacheDir: string): Promise<void> {
  await Promise.all([
    pruneOldFiles(join(cacheDir, THUMBNAILS_DIR), CACHED_FILES_MAX_AGE),
    pruneOldFiles(join(cacheDir, GIFS_DIR), CACHED_FILES_MAX_AGE),
  ]);
}
