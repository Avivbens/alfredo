import type { FastAlfred } from 'fast-alfred';

export function getCacheDir({ alfredInfo }: FastAlfred): string {
  const cacheDir = alfredInfo.cache();
  if (!cacheDir) {
    throw new Error('Alfred passed no workflow cache folder');
  }

  return cacheDir;
}
