import { z } from 'zod';
import { BluetoothError } from './bluetooth-failure.model';

export const OutputIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('switchaudio-failed'), message: z.string() }),
  z.object({ kind: z.literal('bluetooth-error'), error: z.instanceof(BluetoothError) }),
  z.object({ kind: z.literal('bluetooth-off') }),
  z.object({ kind: z.literal('no-paired-devices') }),
]);

export type OutputIssue = z.infer<typeof OutputIssueSchema>;
