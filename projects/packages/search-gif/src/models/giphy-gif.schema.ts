import { z } from 'zod';

const RenditionSchema = z.object({ url: z.url() });
const OptionalRenditionSchema = RenditionSchema.optional().catch(undefined);

/** GIPHY leaves renditions out, or sends them without a URL, so only `original` is required and a broken optional one is dropped. */
export const GiphyGifSchema = z.object({
  id: z.string(),
  title: z.string(),
  images: z.object({
    original: RenditionSchema,
    downsized: OptionalRenditionSchema,
    fixed_width_small_still: OptionalRenditionSchema,
  }),
});

export type GiphyGif = z.infer<typeof GiphyGifSchema>;

/** A GIF with no usable original is dropped, so one bad result cannot fail the rest of the search. */
export const GiphySearchResponseSchema = z.object({
  data: z
    .array(GiphyGifSchema.nullable().catch(null))
    .transform((gifs) => gifs.filter((gif): gif is GiphyGif => !!gif)),
});

export const LastSearchSchema = z.object({ key: z.string(), gifs: z.array(GiphyGifSchema) });
