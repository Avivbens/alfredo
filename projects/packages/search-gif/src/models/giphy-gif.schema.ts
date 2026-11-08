import { z } from 'zod';
import { gifIdSchema } from './gif-id.schema';

const renditionSchema = z.object({ url: z.url() });
const optionalRenditionSchema = renditionSchema.optional().catch(undefined);

/** GIPHY leaves renditions out, or sends them without a URL, so only `original` is required and a broken optional one is dropped. */
export const giphyGifSchema = z.object({
  id: gifIdSchema,
  title: z.string(),
  images: z.object({
    original: renditionSchema,
    downsized: optionalRenditionSchema,
    fixed_width_small_still: optionalRenditionSchema,
  }),
});

export type GiphyGif = z.infer<typeof giphyGifSchema>;

/** A GIF with no usable original is dropped, so one bad result cannot fail the rest of the search. */
export const giphySearchResponseSchema = z.object({
  data: z
    .array(giphyGifSchema.nullable().catch(null))
    .transform((gifs) => gifs.filter((gif): gif is GiphyGif => !!gif)),
});

export const lastSearchSchema = z.object({ key: z.string(), gifs: z.array(giphyGifSchema) });
