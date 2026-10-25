import { homedir } from 'node:os';

/** Alfred stores a checkbox as `1` or `0`. */
export function parseFlag(data: string): boolean {
  return Boolean(Number(data));
}

export function parsePaths(data: string): string[] {
  return data.trim().split('\n').filter(Boolean).map(expandHome);
}

function expandHome(path: string): string {
  return path.replace('~', homedir());
}
