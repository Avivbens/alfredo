import { z } from 'zod';

/** Alfred hands a single string down to the action script, so every actionable row is encoded as one of these. */
export const NetworkActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('join'), ssid: z.string() }),
  z.object({ kind: z.literal('power-on'), device: z.string() }),
]);

export type NetworkAction = z.infer<typeof NetworkActionSchema>;

export function encodeAction(action: NetworkAction): string {
  return JSON.stringify(action);
}
