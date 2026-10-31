import { z } from 'zod';

export const SupportedPlatformSchema = z.enum(['whatsapp', 'sms', 'call', 'mail', 'facetime', 'facetimeaudio']);
export type SupportedPlatform = z.infer<typeof SupportedPlatformSchema>;
