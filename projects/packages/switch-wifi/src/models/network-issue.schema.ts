import { z } from 'zod';

export const NetworkIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-wifi-interface') }),
  z.object({ kind: z.literal('wifi-off'), device: z.string() }),
  z.object({ kind: z.literal('no-saved-networks') }),
  z.object({ kind: z.literal('networksetup-failed'), message: z.string() }),
]);

export type NetworkIssue = z.infer<typeof NetworkIssueSchema>;
