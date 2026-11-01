import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Never throws, since housekeeping must not cost the user their results. */
export async function pruneOldFiles(dir: string, maxAge: number): Promise<void> {
  const cutoff = Date.now() - maxAge;
  const names = await listFiles(dir);

  await Promise.allSettled(
    names.map(async (name) => {
      const path = join(dir, name);
      const { mtimeMs } = await stat(path);
      if (mtimeMs < cutoff) {
        await rm(path, { force: true });
      }
    }),
  );
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
