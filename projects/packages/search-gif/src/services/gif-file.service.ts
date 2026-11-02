import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CopyPayload } from '../models/copy-payload.schema';
import { downloadFile, isFile } from './files.service';
import { toPreviewPath } from './preview.service';

/** A preloaded preview is copied rather than reused in place, since previews expire within the hour and a clipboard manager may paste this file days later. */
export async function getGifFile({ id, url }: CopyPayload, dir: string, previewsDir: string): Promise<string> {
  const path = join(dir, `${id}.gif`);
  if (await isFile(path)) {
    return path;
  }

  const preview = toPreviewPath(previewsDir, id);
  if (await isFile(preview)) {
    await mkdir(dir, { recursive: true });
    await copyFile(preview, path);
    return path;
  }

  await downloadFile(url, path);
  return path;
}
