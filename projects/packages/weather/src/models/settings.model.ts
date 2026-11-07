import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const settingsSchema = z.object({
  weather_keyword: z.string().default('weather'),
  saved_places: alfredSchemas.lines().default([]),
  show_current_location: alfredSchemas.checkbox().default(true),
});

export type Settings = z.infer<typeof settingsSchema>;
