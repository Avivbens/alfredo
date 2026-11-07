import { z } from 'zod';
import { geocodingResultSchema } from '../../models/open-meteo.schema';

export const searchMapSchema = z.record(
  z.string(),
  z.object({ fetchedAt: z.number(), results: z.array(geocodingResultSchema) }),
);

export type SearchMap = z.infer<typeof searchMapSchema>;
