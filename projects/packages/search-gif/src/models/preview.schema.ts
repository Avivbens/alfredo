import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const PreviewDownloadSchema = z.object({ id: z.string(), url: z.url() });

export type PreviewDownload = z.infer<typeof PreviewDownloadSchema>;

export const PreviewDownloadsSchema = z.array(PreviewDownloadSchema);

/** Alfred passes a script filter's variables back in when it reruns it, which is how the list counts its own reruns. */
export const PreviewRerunVariablesSchema = z.object({
  preview_query: z.string().default(''),
  preview_reruns: alfredSchemas.number().default(0),
});

export type PreviewRerunVariables = z.infer<typeof PreviewRerunVariablesSchema>;
