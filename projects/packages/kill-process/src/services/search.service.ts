import Fuse from 'fuse.js';
import type { Port } from 'occupied-ports';
import type { ProcessDescriptor } from 'ps-list';
import { SEARCH_PORT_FIELDS_CONFIG, SEARCH_PROCESS_FIELDS_CONFIG } from './search.config.js';

export async function searchProcess(
  processes: ProcessDescriptor[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<ProcessDescriptor[]> {
  const fuse = new Fuse(processes, {
    keys: SEARCH_PROCESS_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });

  return res.map((item) => item.item);
}

export async function searchPort(ports: Port[], searchTerm: string, limit: number, threshold: number) {
  const fuse = new Fuse(ports, {
    keys: SEARCH_PORT_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });

  return res.map((item) => item.item);
}
