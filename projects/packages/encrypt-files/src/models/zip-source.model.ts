import { z } from 'zod';

const entryMetadataSchema = z.object({ entryName: z.string(), lastModDate: z.date(), mode: z.number() });

export const zipSourceSchema = z.discriminatedUnion('kind', [
  entryMetadataSchema.extend({ kind: z.literal('directory') }),
  entryMetadataSchema.extend({ kind: z.literal('file'), sourcePath: z.string(), size: z.number() }),
]);

export type ZipSource = z.infer<typeof zipSourceSchema>;
