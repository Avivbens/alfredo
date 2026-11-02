import type { AlfredListItem, AlfredScriptFilter, IconService } from 'fast-alfred';
import { getCheckouts, readLocalStacks } from '@alfredo/git-worktrees';
import type { CheckoutEntry } from '../models/checkout-entry.model';
import type { WorktreesRoute } from '../models/routes.model';
import { toCheckoutEntries } from './checkout-groups.service';
import { isDirty } from './dirty.service';
import { toCheckoutItem, toStackHeaderItem } from './file-item.service';

export async function loadCheckoutOutput(
  { state, filter }: WorktreesRoute,
  icons: IconService,
): Promise<AlfredScriptFilter> {
  const [checkouts, stacks] = await Promise.all([getCheckouts(state.repoPath), readLocalStacks(state.repoPath)]);
  const entries = toCheckoutEntries(checkouts, stacks, filter);

  const items = await Promise.all(entries.map((entry) => toCheckoutEntryItem(entry, icons)));

  /** Alfred re-sorts rows that carry a uid by its usage knowledge, which would split a stack's rows apart. */
  return { items, skipknowledge: true };
}

async function toCheckoutEntryItem(entry: CheckoutEntry, icons: IconService): Promise<AlfredListItem> {
  switch (entry.kind) {
    case 'stack-header': {
      return toStackHeaderItem(entry, icons);
    }
    case 'checkout': {
      const { checkout, layer, glyph } = entry;
      const dirty = await isDirty(checkout.path);

      return toCheckoutItem(checkout, icons, { dirty, layer, glyph });
    }
  }
}
