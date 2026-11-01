import { join } from 'node:path';
import type { CopyPayload } from '../models/copy-payload.schema';
import { downloadFile, isFile } from './files.service';

export async function getGifFile({ id, url }: CopyPayload, dir: string): Promise<string> {
  const path = join(dir, `${id}.gif`);
  if (!(await isFile(path))) {
    await downloadFile(url, path);
  }

  return path;
}
