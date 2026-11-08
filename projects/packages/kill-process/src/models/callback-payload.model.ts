import { z } from 'zod';

/** `kill` with 0 or a negative id signals a whole process group (`-1` is every process the user owns), so only positive ids pass. */
export const callbackPayloadSchema = z.object({
  pid: z.number().int().positive(),
  name: z.string(),
  shouldForceKill: z.boolean(),
  cmd: z.string().optional(),
});
export type CallbackPayload = z.infer<typeof callbackPayloadSchema>;
