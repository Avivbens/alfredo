import { ZIP64_THRESHOLD } from '../config/constants';

/** A streamed entry has no size up front, so ZIP64 is decided from the size on disk before writing */
export function needsZip64(size: number): boolean {
  return size > ZIP64_THRESHOLD;
}
