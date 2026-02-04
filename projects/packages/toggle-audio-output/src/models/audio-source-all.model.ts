import { z } from 'zod';

export const AudioSourceSchema = z.object({
  name: z.string(),
  type: z.enum(['output', 'input']),
  id: z.string(),
  uid: z.string(),
});

export type AudioSource = z.infer<typeof AudioSourceSchema>;
