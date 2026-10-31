import type { AlfredListItem } from 'fast-alfred';
import type { ContactPayload } from '../models/contact-payload.model';
import type { IContact } from '../models/contact.model';

export function toContactItem(
  { firstName, lastName, phoneNumbers, emailAddresses }: IContact,
  { countryCode, platform }: Pick<ContactPayload, 'countryCode' | 'platform'>,
): AlfredListItem {
  const payload: ContactPayload = {
    phoneNumber: phoneNumbers[0],
    emailAddress: emailAddresses[0],
    countryCode,
    platform,
  };

  const emailSubtitle = emailAddresses.length ? `Email: ${emailAddresses[0]}` : '';
  const phoneSubtitle = phoneNumbers.length ? `Phone: ${phoneNumbers[0]}` : '';

  const subtitle = [phoneSubtitle, emailSubtitle].filter(Boolean).join(' | ');
  const arg = JSON.stringify(payload);

  return {
    title: `${firstName} ${lastName}`,
    subtitle,
    arg,
    uid: arg,
  };
}
