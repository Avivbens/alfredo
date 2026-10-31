import { FastAlfred } from 'fast-alfred';
import { alfredSchemas } from 'fast-alfred/schemas';
import { parsePhoneNumber } from 'libphonenumber-js';
import { $ } from 'zurk';
import { type ContactPayload, ContactPayloadSchema } from '../models/contact-payload.model';
import { buildOpenUrl, isPhonePlatform } from '../services/platform-url-builder.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const input = alfredSchemas.json(ContactPayloadSchema).parse(alfredClient.input);

    const { phoneNumber: inputPhoneNumber, countryCode: inputCountryCode, platform } = input;

    /** Parsing throws for a contact without a phone number, which Mail doesn't need */
    const parsedInput: ContactPayload = isPhonePlatform(platform)
      ? { ...input, phoneNumber: parsePhoneNumber(inputPhoneNumber ?? '', inputCountryCode).number }
      : input;

    const openUrl = buildOpenUrl(platform, parsedInput);

    /** zurk quotes `openUrl`, so a contact's email can't run as a shell command */
    await $`open ${openUrl}`;
  } catch (error) {
    alfredClient.error(error);
  }
})();
