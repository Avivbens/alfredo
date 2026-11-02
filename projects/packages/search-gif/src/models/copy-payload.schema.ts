import { z } from 'zod';

/** Alfred hands a single string down to the action script, so a GIF row encodes what copying it needs. */
export const copyPayloadSchema = z.object({ id: z.string(), url: z.url() });

export type CopyPayload = z.infer<typeof copyPayloadSchema>;

export function encodeCopyPayload(payload: CopyPayload): string {
  return JSON.stringify(payload);
}
