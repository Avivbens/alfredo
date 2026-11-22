import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const settingsSchema = z.object({
  hide_file_names: alfredSchemas.checkbox().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
