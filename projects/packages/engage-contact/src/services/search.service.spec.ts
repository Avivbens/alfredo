import { describe, expect, it } from 'vitest';
import type { IContact } from '../models/contact.model';
import { searchContacts } from './search.service';

/** Shaped like `node-mac-contacts` `getAllContacts()` output, trimmed to the fields the workflow reads */
const CONTACTS: IContact[] = [
  {
    identifier: '410FE041-5C4E-48DA-B4DE-04C15EA3DBAC:ABPerson',
    firstName: 'Jane',
    lastName: 'Doe',
    nickname: '',
    birthday: '',
    phoneNumbers: ['+972 50-123-4567'],
    emailAddresses: ['jane.doe@acme.com'],
    postalAddresses: [],
  },
  {
    identifier: '2E73EE73-C03F-4D5F-B1E8-44E85A70F170:ABPerson',
    firstName: 'John',
    lastName: 'Smith',
    nickname: '',
    birthday: '',
    phoneNumbers: ['(808) 1234 567'],
    emailAddresses: [],
    postalAddresses: [],
  },
  {
    identifier: 'AB211C5F-9EC9-429F-9466-B9382FF61891:ABPerson',
    firstName: 'Janet',
    lastName: 'Levi',
    nickname: '',
    birthday: '',
    phoneNumbers: [],
    emailAddresses: ['janet@levi.dev'],
    postalAddresses: [],
  },
];

const DEFAULT_LIMIT = 10;
const DEFAULT_THRESHOLD = 0.4;

function toNames(contacts: IContact[]): string[] {
  return contacts.map(({ firstName, lastName }) => `${firstName} ${lastName}`);
}

describe('search.service', () => {
  describe('searchContacts', () => {
    it('should find contacts by part of the first name, best match first', async () => {
      const result = await searchContacts(CONTACTS, 'jane', DEFAULT_LIMIT, DEFAULT_THRESHOLD);

      expect(toNames(result)).toEqual(['Jane Doe', 'Janet Levi']);
    });

    it('should find a contact by last name, ignoring case', async () => {
      const result = await searchContacts(CONTACTS, 'SMITH', DEFAULT_LIMIT, DEFAULT_THRESHOLD);

      expect(toNames(result)).toEqual(['John Smith']);
    });

    it('should find a contact despite a typo within the threshold', async () => {
      const result = await searchContacts(CONTACTS, 'smiht', DEFAULT_LIMIT, DEFAULT_THRESHOLD);

      expect(toNames(result)).toEqual(['John Smith']);
    });

    it('should find a contact by phone number', async () => {
      const result = await searchContacts(CONTACTS, '1234 567', DEFAULT_LIMIT, DEFAULT_THRESHOLD);

      expect(toNames(result)).toContain('John Smith');
    });

    it('should find a contact by email', async () => {
      const result = await searchContacts(CONTACTS, 'janet@levi', DEFAULT_LIMIT, DEFAULT_THRESHOLD);

      expect(toNames(result)[0]).toBe('Janet Levi');
    });

    it('should return at most `limit` contacts', async () => {
      const result = await searchContacts(CONTACTS, 'jane', 1, DEFAULT_THRESHOLD);

      expect(toNames(result)).toEqual(['Jane Doe']);
    });

    it('should drop fuzzy matches when the threshold allows exact matches only', async () => {
      const result = await searchContacts(CONTACTS, 'smiht', DEFAULT_LIMIT, 0);

      expect(result).toEqual([]);
    });
  });
});
