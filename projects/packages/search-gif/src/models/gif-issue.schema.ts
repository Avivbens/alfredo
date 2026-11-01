import { z } from 'zod';

export const GifIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('empty-query') }),
  z.object({ kind: z.literal('missing-api-key') }),
  z.object({ kind: z.literal('no-results'), query: z.string() }),
  z.object({ kind: z.literal('invalid-api-key') }),
  z.object({ kind: z.literal('rate-limited') }),
  z.object({ kind: z.literal('request-failed'), message: z.string() }),
]);

export type GifIssue = z.infer<typeof GifIssueSchema>;
