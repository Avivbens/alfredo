import type { IContact } from '../models/contact.model';

type SearchField = keyof IContact;
export const SEARCH_FIELDS_CONFIG: SearchField[] = ['firstName', 'lastName', 'phoneNumbers', 'emailAddresses'];
