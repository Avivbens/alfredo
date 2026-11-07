import { z } from 'zod';

export const weatherIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('no-places') }),
  z.object({ kind: z.literal('location-unavailable') }),
  z.object({ kind: z.literal('place-not-found'), name: z.string() }),
  z.object({ kind: z.literal('no-hours'), name: z.string() }),
  z.object({ kind: z.literal('request-failed'), name: z.string(), message: z.string() }),
]);

export type WeatherIssue = z.infer<typeof weatherIssueSchema>;
