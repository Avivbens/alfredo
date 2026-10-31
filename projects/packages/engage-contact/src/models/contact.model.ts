import { z } from 'zod';

export const ContactSchema = z.object({
  identifier: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string(),
  birthday: z.string(),
  phoneNumbers: z.array(z.string()),
  emailAddresses: z.array(z.string()),
  postalAddresses: z.array(z.string()),
});
export type IContact = z.infer<typeof ContactSchema>;

export const ContactListSchema = z.array(ContactSchema);
