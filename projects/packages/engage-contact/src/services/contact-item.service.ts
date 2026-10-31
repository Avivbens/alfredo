import type { AlfredListItem } from 'fast-alfred';
import type { ContactPayload } from '../models/contact-payload.model';
import type { IContact } from '../models/contact.model';
import type { SupportedPlatform } from '../models/platform.model';
import { isPhonePlatform } from './platform-url-builder.service';

export function hasPlatformField({ phoneNumbers, emailAddresses }: IContact, platform: SupportedPlatform): boolean {
  return isPhonePlatform(platform) ? phoneNumbers.length > 0 : emailAddresses.length > 0;
}

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
