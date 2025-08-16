import Fuse from 'fuse.js';
import { SEARCH_DB_CONNECTION_CONFIG } from '../config/search.config';
import { TablePlusConfig } from '../models/table-plus-config.model';

export async function searchConnection(
  connections: TablePlusConfig[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<TablePlusConfig[]> {
  if (!searchTerm || searchTerm.trim() === '') {
    return connections.slice(0, limit);
  }

  const fuse = new Fuse(connections, {
    keys: SEARCH_DB_CONNECTION_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    findAllMatches: true,
    ignoreLocation: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });
  return res.map((item) => item.item);
}
