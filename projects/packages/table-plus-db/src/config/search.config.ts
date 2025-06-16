import type { FuseOptionKey } from 'fuse.js';
import { TablePlusConfig } from '../models/table-plus-config.model';

export const SEARCH_DB_CONNECTION_CONFIG: FuseOptionKey<TablePlusConfig>[] = [
  { name: 'ConnectionName', weight: 5 },
  { name: 'ID', weight: 2 },
  { name: 'Enviroment', weight: 3 },
];
