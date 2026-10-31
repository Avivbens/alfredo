import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import type { IContact } from '../models/contact.model';
import { ContactsInputsSchema } from '../models/contacts-inputs.model';
import { SettingsSchema } from '../models/settings.model';
import { toContactItem } from '../services/contact-item.service';
import { getContacts } from '../services/contacts.service';
import { searchContacts } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('engage-contact'));

  try {
    const [searchTerm, platform] = ContactsInputsSchema.parse(alfredClient.inputs);
    const { countryCode, sliceAmount, fuzzyThreshold } = alfredClient.env.parse(SettingsSchema);

    const contacts: IContact[] = getContacts(alfredClient);

    const filteredContacts = await searchContacts(contacts, searchTerm, sliceAmount, fuzzyThreshold);

    const items: AlfredListItem[] = filteredContacts
      .map((contact) => toContactItem(contact, { countryCode, platform }))
      .filter(({ subtitle }) => subtitle);

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
