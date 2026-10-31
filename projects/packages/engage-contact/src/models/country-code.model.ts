import { isSupportedCountry } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';
import { z } from 'zod';

export const CountryCodeSchema = z.custom<CountryCode>(
  (code) => typeof code === 'string' && isSupportedCountry(code),
  'Unsupported country code',
);
