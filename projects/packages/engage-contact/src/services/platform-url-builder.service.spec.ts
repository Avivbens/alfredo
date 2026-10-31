import { describe, expect, it } from 'vitest';
import type { ContactPayload } from '../models/contact-payload.model';
import type { SupportedPlatform } from '../models/platform.model';
import { buildOpenUrl, isPhonePlatform } from './platform-url-builder.service';

/** The payload `engage-contact.ts` builds, after the phone number is parsed to E.164 */
const PAYLOAD: ContactPayload = {
  phoneNumber: '+972501234567',
  emailAddress: 'jane.doe@acme.com',
  countryCode: 'IL',
  platform: 'whatsapp',
};

describe('platform-url-builder.service', () => {
  describe('buildOpenUrl', () => {
    it.each<[SupportedPlatform, string]>([
      ['whatsapp', 'whatsapp://send?phone=+972501234567'],
      ['sms', 'sms:+972501234567'],
      ['call', 'tel:+972501234567'],
      ['facetime', 'facetime:+972501234567'],
      ['facetimeaudio', 'facetime-audio:+972501234567'],
      ['mail', 'mailto:jane.doe@acme.com'],
    ])('should open %s with %s', (platform, expectedUrl) => {
      expect(buildOpenUrl(platform, { ...PAYLOAD, platform })).toBe(expectedUrl);
    });

    it('should throw when the contact has no value for the platform, like mail for a phone-only contact', () => {
      const phoneOnly: ContactPayload = { ...PAYLOAD, emailAddress: undefined, platform: 'mail' };

      expect(() => buildOpenUrl('mail', phoneOnly)).toThrow('Referrer is empty: emailAddress');
    });

    it('should throw for a platform it has no URL for, since the engage step reads the platform from the Alfred arg unchecked', () => {
      const platform = 'telegram' as SupportedPlatform;

      expect(() => buildOpenUrl(platform, { ...PAYLOAD, platform })).toThrow('Unsupported platform: telegram');
    });
  });

  describe('isPhonePlatform', () => {
    it.each<SupportedPlatform>(['whatsapp', 'sms', 'call', 'facetime', 'facetimeaudio'])(
      'should treat %s as a phone platform',
      (platform) => {
        expect(isPhonePlatform(platform)).toBe(true);
      },
    );

    it('should not treat mail as a phone platform, so engaging an email-only contact skips the phone parsing', () => {
      expect(isPhonePlatform('mail')).toBe(false);
    });
  });
});
