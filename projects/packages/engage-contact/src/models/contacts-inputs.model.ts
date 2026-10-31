import { z } from 'zod';
import { SupportedPlatformSchema } from './platform.model';

export const ContactsInputsSchema = z.tuple([z.string(), SupportedPlatformSchema]);
