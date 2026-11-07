import { z } from 'zod';

/** ipwho.is answers a failed lookup with HTTP 200 and `success: false` */
export const ipWhoIsSchema = z.object({
  success: z.literal(true),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

/** geojs sends its coordinates as strings */
export const geoJsSchema = z.object({
  city: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});
