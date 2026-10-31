import { z } from 'zod';
import { CountryCodeSchema } from './country-code.model';
import { SupportedPlatformSchema } from './platform.model';

export const ContactPayloadSchema = z.object({
  phoneNumber: z.string().optional(),
  emailAddress: z.string().optional(),
  countryCode: CountryCodeSchema,
  platform: SupportedPlatformSchema,
});
export type ContactPayload = z.infer<typeof ContactPayloadSchema>;
