import { ZIP64_THRESHOLD } from '../config/constants';
import type { ZipSource } from '../models/zip-source.model';

/** Room for each entry's local and central headers inside the hidden-names Contents.zip */
const ENTRY_OVERHEAD_BYTES = 4096;

/** A streamed entry has no size up front, so ZIP64 is decided from the size on disk before writing */
export function needsZip64(size: number): boolean {
  return size > ZIP64_THRESHOLD;
}

export function needsContentsZip64(sources: ZipSource[]): boolean {
  const contentSize = sources.reduce((total, source) => total + (source.kind === 'file' ? source.size : 0), 0);

  return needsZip64(contentSize + sources.length * ENTRY_OVERHEAD_BYTES);
}
