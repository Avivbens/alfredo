import type { FuseOptionKey } from 'fuse.js';
import type { Port } from 'occupied-ports';
import type { ProcessDescriptor } from 'ps-list';

export const SEARCH_PROCESS_FIELDS_CONFIG: FuseOptionKey<ProcessDescriptor>[] = [
  { name: 'name', weight: 2 },
  { name: 'pid', weight: 1 },
  { name: 'cmd', weight: 4 },
];

export const SEARCH_PORT_FIELDS_CONFIG: FuseOptionKey<Port>[] = [
  { name: 'name', weight: 2 },
  { name: 'pid', weight: 1 },
  { name: 'port', weight: 4 },
];
