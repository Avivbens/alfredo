import type { Settings } from '../../models/settings.model';

/** Scan settings are part of the key, so changing them never serves a stale clone list. */
export function toClonesCacheKey({ repo_roots, scan_depth }: Pick<Settings, 'repo_roots' | 'scan_depth'>): string {
  return `clones:${scan_depth}:${repo_roots.join('|')}`;
}
