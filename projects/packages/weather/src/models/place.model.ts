import { z } from 'zod';

export const placeSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type Place = z.infer<typeof placeSchema>;

export type ResolvedPlace = Place & { source: 'current' | 'saved' };

export type Coordinates = Pick<Place, 'latitude' | 'longitude'>;
