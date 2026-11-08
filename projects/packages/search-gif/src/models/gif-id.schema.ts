import { z } from 'zod';

/** A GIF id names its cached files, so only a plain name passes, never one that could climb out of the cache folder. */
export const gifIdSchema = z.string().regex(/^[\w-]+$/);
