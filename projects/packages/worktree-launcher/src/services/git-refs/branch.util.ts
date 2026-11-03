/**
 * The `+` keeps `origin/<branch>` current even in a clone with a narrowed fetch refspec, so a fast-forward never reads
 * a stale ref.
 */
export function toFetchRefspec(branch: string): string {
  return `+refs/heads/${branch}:refs/remotes/origin/${branch}`;
}
