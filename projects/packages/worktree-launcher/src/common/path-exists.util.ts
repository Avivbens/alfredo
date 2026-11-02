import { access, lstat } from 'node:fs/promises';

/** `lstat` does not follow symlinks, so even a dangling link takes the path. */
export async function isPathTaken(path: string): Promise<boolean> {
  try {
    await lstat(path);

    return true;
  } catch {
    return false;
  }
}

/** `access` follows symlinks, so a link to nothing is not reachable. */
export async function isPathReachable(path: string): Promise<boolean> {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
}
