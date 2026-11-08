import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { gifIdSchema } from './gif-id.schema';

export const previewDownloadSchema = z.object({ id: gifIdSchema, url: z.url() });

export type PreviewDownload = z.infer<typeof previewDownloadSchema>;

export const previewDownloadsSchema = z.array(previewDownloadSchema);

/** Alfred passes a script filter's variables back in when it reruns it, which is how the list counts its own reruns. */
export const previewRerunVariablesSchema = z.object({
  preview_query: z.string().default(''),
  preview_reruns: alfredSchemas.number().default(0),
});

export type PreviewRerunVariables = z.infer<typeof previewRerunVariablesSchema>;
