import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Written under a temp name, then renamed, since Quick Look may open a preview the moment it exists and two preloads can fetch the same GIF. */
export async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  }

  const tempPath = `${path}.${process.pid}.part`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(tempPath, Buffer.from(await response.arrayBuffer()));
  await rename(tempPath, path);
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
