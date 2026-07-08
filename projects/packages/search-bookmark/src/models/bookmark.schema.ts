import { z } from 'zod';

export enum Type {
  Folder = 'folder',
  URL = 'url',
}

export const metaInfoSchema = z.object({
  power_bookmark_meta: z.string().optional(),
  last_visited_desktop: z.string().optional(),
});

export const typeSchema = z.nativeEnum(Type);

export const iUIBookmarkSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: typeSchema,
  profile: z.string(),
});

export interface IBookmark {
  children?: IBookmark[];
  date_added?: string;
  date_last_used?: string;
  date_modified?: string;
  guid?: string;
  id?: string;
  meta_info?: z.infer<typeof metaInfoSchema>;
  name: string;
  type: Type;
  url?: string;
}

/**
 * A node in a Chrome bookmarks file — a folder (with `children`) or a URL leaf.
 * Only `name`/`type` are required since those are all we consume; every other
 * field is optional so a valid file is never rejected over metadata we ignore.
 */
export const iBookmarkSchema: z.ZodSchema<IBookmark> = z.lazy(() =>
  z.object({
    children: z.array(iBookmarkSchema).optional(),
    date_added: z.string().optional(),
    date_last_used: z.string().optional(),
    date_modified: z.string().optional(),
    guid: z.string().optional(),
    id: z.string().optional(),
    meta_info: metaInfoSchema.optional(),
    name: z.string(),
    type: typeSchema,
    url: z.string().optional(),
  }),
);

/**
 * Roots are optional so a file missing one (e.g. an empty `synced`, or a
 * profile with only account bookmarks) still parses and we salvage the rest.
 */
export const iBookmarkRootSchema = z.object({
  bookmark_bar: iBookmarkSchema.optional(),
  other: iBookmarkSchema.optional(),
  synced: iBookmarkSchema.optional(),
});

/**
 * `checksum`/`sync_metadata`/`version` are metadata we never read and real
 * files sometimes omit (e.g. a fresh `Bookmarks` has no `sync_metadata`), so
 * they stay optional — only `roots` matters.
 */
export const iBookmarkResSchema = z.object({
  checksum: z.string().optional(),
  roots: iBookmarkRootSchema,
  sync_metadata: z.string().optional(),
  version: z.number().optional(),
});

export type MetaInfo = z.infer<typeof metaInfoSchema>;
export type IUIBookmark = z.infer<typeof iUIBookmarkSchema>;
export type IBookmarkRes = z.infer<typeof iBookmarkResSchema>;
