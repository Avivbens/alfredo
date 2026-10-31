import type { FastAlfred } from 'fast-alfred';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import contacts from 'node-mac-contacts';
import { CACHE_CONTACTS_KEY, CACHE_TTL } from '../common/constants';
import { AuthStatusSchema } from '../models/auth-status.model';
import { ContactListSchema } from '../models/contact.model';
import type { IContact } from '../models/contact.model';

export function isAuth(): boolean {
  return AuthStatusSchema.parse(contacts.getAuthStatus()) === 'Authorized';
}

export function requestAuth(): void {
  contacts.requestAccess();
}

export function getContacts(alfredClient: FastAlfred): IContact[] {
  const isHasAccess: boolean = isAuth();
  if (!isHasAccess) {
    requestAuth();
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
