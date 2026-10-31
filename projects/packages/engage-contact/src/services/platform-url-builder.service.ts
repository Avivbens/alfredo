import type { ContactPayload } from '../models/contact-payload.model';
import type { SupportedPlatform } from '../models/platform.model';

const PLATFORMS_URLS: Record<SupportedPlatform, (referrer: string) => string> = {
  whatsapp: (referrer: string) => `whatsapp://send?phone=${referrer}`,
  sms: (referrer: string) => `sms:${referrer}`,
  call: (referrer: string) => `tel:${referrer}`,
  mail: (referrer: string) => `mailto:${referrer}`,
  facetime: (referrer: string) => `facetime:${referrer}`,
  facetimeaudio: (referrer: string) => `facetime-audio:${referrer}`,
};

const EXTRACT_REFERRER: Record<SupportedPlatform, keyof ContactPayload> = {
  call: 'phoneNumber',
  mail: 'emailAddress',
  sms: 'phoneNumber',
  whatsapp: 'phoneNumber',
  facetime: 'phoneNumber',
  facetimeaudio: 'phoneNumber',
};

export function isPhonePlatform(platform: SupportedPlatform): boolean {
  return EXTRACT_REFERRER[platform] === 'phoneNumber';
}

export function buildOpenUrl(platform: SupportedPlatform, payload: ContactPayload): string {
  const urlBuilder = PLATFORMS_URLS[platform];

  if (!urlBuilder) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const referrerKey = EXTRACT_REFERRER[platform];
  if (!referrerKey) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const referrer = payload[referrerKey];

  if (!referrer) {
    throw new Error(`Referrer is empty: ${referrerKey}`);
  }

  const res = urlBuilder(referrer);
  return res;
}
