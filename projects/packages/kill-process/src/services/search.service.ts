import Fuse from 'fuse.js';
import type { Port } from 'occupied-ports';
import type { ProcessWithBattery } from '../models/process-with-battery.model';
import { SortByResource } from '../models/sort-by-resources.model';
import { SEARCH_PORT_FIELDS_CONFIG, SEARCH_PROCESS_FIELDS_CONFIG } from './search.config';

function sortProcessesByResource(processes: ProcessWithBattery[], sortBy: SortByResource): ProcessWithBattery[] {
  if (sortBy === 'none') {
    return processes;
  }

  if (sortBy === 'cpu') {
    return processes.toSorted((a, b) => {
      const cpuA = a.cpu ?? 0;
      const cpuB = b.cpu ?? 0;
      return cpuB - cpuA; // Sort descending (highest CPU first)
    });
  }

  if (sortBy === 'memory') {
    return processes.toSorted((a, b) => {
      const memA = a.memory ?? 0;
      const memB = b.memory ?? 0;
      return memB - memA; // Sort descending (highest memory first)
    });
  }

  if (sortBy === 'battery') {
    return processes.toSorted((a, b) => {
      const batteryA = a.battery ?? 0;
      const batteryB = b.battery ?? 0;
      return batteryB - batteryA; // Sort descending (highest energy impact first)
    });
  }

  throw new Error(`Unsupported sortBy value: ${sortBy}`);
}

export async function searchProcess(
  processes: ProcessWithBattery[],
  searchTerm: string,
  limit: number,
  threshold: number,
  sortBy: SortByResource,
): Promise<ProcessWithBattery[]> {
  if (!searchTerm?.trim()) {
    const sorted = sortProcessesByResource(processes, sortBy);
    return sorted.slice(0, limit);
  }

  // Perform fuzzy search for non-empty search terms
  const fuse = new Fuse(processes, {
    keys: SEARCH_PROCESS_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: sortBy === 'none',
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });
  const results = res.map((item) => item.item);

  return sortProcessesByResource(results, sortBy);
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
