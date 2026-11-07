import { type RouteMatch, type RouterService, defineRoutes } from 'fast-alfred';
import { z } from 'zod';
import { placeSchema } from './place.model';

export const ROUTES = defineRoutes({
  days: { schema: placeSchema, marker: '›' },
  hours: { schema: placeSchema.extend({ date: z.string() }), marker: '›' },
});

export type AppRouter = RouterService<typeof ROUTES>;
export type DaysRoute = RouteMatch<typeof ROUTES, 'days'>;
export type HoursRoute = RouteMatch<typeof ROUTES, 'hours'>;
