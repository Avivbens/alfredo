import type { IContact } from '../models/contact.model';
import { SEARCH_FIELDS_CONFIG } from './search.config';

export async function searchContacts(
  contacts: IContact[],
  searchTerm: string,
  limit: number,
  threshold: number,
): Promise<IContact[]> {
  const Fuse = (await import('fuse.js/min-basic')).default;

  const fuse = new Fuse(contacts, {
    keys: SEARCH_FIELDS_CONFIG,
    isCaseSensitive: false,
    shouldSort: true,
    threshold,
  });

  const res = fuse.search(searchTerm, { limit });

  return res.map((item) => item.item);
}
