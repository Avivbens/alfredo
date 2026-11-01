import { z } from 'zod';

/** Alfred hands a single string down to the action script, so a GIF row encodes what copying it needs. */
export const CopyPayloadSchema = z.object({ id: z.string(), url: z.url() });

export type CopyPayload = z.infer<typeof CopyPayloadSchema>;

export function encodeCopyPayload(payload: CopyPayload): string {
  return JSON.stringify(payload);
}
