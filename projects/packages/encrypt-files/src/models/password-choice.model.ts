import { z } from 'zod';

export const passwordChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('typed'), password: z.string() }),
  z.object({ kind: z.literal('generated'), password: z.string() }),
  z.object({ kind: z.literal('cancelled') }),
]);

export type PasswordChoice = z.infer<typeof passwordChoiceSchema>;
