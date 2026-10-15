import { z } from 'zod';

/**
 * Alfred can only hand a single string down to the action script, so every row
 * the script filter offers - including the ones that recover from a setup
 * problem - is encoded as one of these payloads.
 */
export const BluetoothActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reconnect'), address: z.string(), name: z.string() }),
  z.object({ kind: z.literal('disconnect'), address: z.string(), name: z.string() }),
  z.object({ kind: z.literal('power-on') }),
  z.object({ kind: z.literal('grant-access') }),
]);

export type BluetoothAction = z.infer<typeof BluetoothActionSchema>;

export function encodeAction(action: BluetoothAction): string {
  return JSON.stringify(action);
}
