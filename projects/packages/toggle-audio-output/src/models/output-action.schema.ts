import { z } from 'zod';

/**
 * Alfred can only hand a single string down to the action script, so every row
 * the script filter offers - including the ones that recover from a setup
 * problem - is encoded as one of these payloads.
 */
export const OutputActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('switch'), uid: z.string(), name: z.string() }),
  z.object({ kind: z.literal('airplay'), name: z.string() }),
  z.object({ kind: z.literal('reconnect'), address: z.string(), name: z.string() }),
  z.object({ kind: z.literal('disconnect'), address: z.string(), name: z.string() }),
  z.object({ kind: z.literal('power-on') }),
  z.object({ kind: z.literal('grant-access') }),
]);

export type OutputAction = z.infer<typeof OutputActionSchema>;

export function encodeAction(action: OutputAction): string {
  return JSON.stringify(action);
}
