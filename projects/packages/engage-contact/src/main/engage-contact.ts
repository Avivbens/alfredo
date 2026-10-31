import { FastAlfred } from 'fast-alfred';
import { alfredSchemas } from 'fast-alfred/schemas';
import type { PhoneNumber } from 'libphonenumber-js';
import { parsePhoneNumber } from 'libphonenumber-js';
import { execPromise } from '../common/utils';
import { ContactPayloadSchema } from '../models/contact-payload.model';
import { buildOpenUrl } from '../services/platform-url-builder.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const input = alfredSchemas.json(ContactPayloadSchema).parse(alfredClient.input);

    const { phoneNumber: inputPhoneNumber, countryCode: inputCountryCode, platform } = input;

    const { number }: PhoneNumber = parsePhoneNumber(inputPhoneNumber ?? '', inputCountryCode);

    const parsedInput = {
      ...input,
      phoneNumber: number,
    };

    const openUrl = buildOpenUrl(platform, parsedInput);

    await execPromise(`open ${openUrl}`);
  } catch (error) {
    alfredClient.error(error);
  }
})();
