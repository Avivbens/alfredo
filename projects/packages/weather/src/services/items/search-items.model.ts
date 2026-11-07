import type { AlfredListItem } from 'fast-alfred';

export interface SearchRows {
  items: AlfredListItem[];
  failed: boolean;
}
