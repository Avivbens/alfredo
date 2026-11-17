import type { FastAlfred } from 'fast-alfred';
import { $ } from 'zurk';
import { CACHE_CONTACTS_KEY, CACHE_TTL, NATIVE_ADDON_PATH } from '../common/constants';
import { AuthStatusSchema } from '../models/auth-status.model';
import { ContactListSchema } from '../models/contact.model';
import type { IContact } from '../models/contact.model';

/**
 * A browser download quarantines the workflow on import, and Gatekeeper refuses to load the ad-hoc signed addon while
 * the flag is set, so it is cleared before the first load
 */
async function loadContactsModule() {
  await $({ nothrow: true })`xattr -d com.apple.quarantine ${NATIVE_ADDON_PATH}`;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const { default: contacts } = await import('node-mac-contacts');

  return contacts;
}

export async function getContacts(alfredClient: FastAlfred): Promise<IContact[]> {
  const contacts = await loadContactsModule();

  const isHasAccess: boolean = AuthStatusSchema.parse(contacts.getAuthStatus()) === 'Authorized';
  if (!isHasAccess) {
    contacts.requestAccess();
    return [];
  }

  const cacheContacts = alfredClient.cache.get(CACHE_CONTACTS_KEY);
  if (cacheContacts) {
    return ContactListSchema.parse(cacheContacts);
  }

  const fetchedContacts = ContactListSchema.parse(contacts.getAllContacts());
  alfredClient.cache.setWithTTL(CACHE_CONTACTS_KEY, fetchedContacts, { maxAge: CACHE_TTL });

  return fetchedContacts;
}
