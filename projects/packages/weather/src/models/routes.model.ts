import { type RouteMatch, type RouterService, defineRoutes } from 'fast-alfred';
import { placeSchema } from './place.model';

export const ROUTES = defineRoutes({
  days: { schema: placeSchema, marker: '›' },
});

export type AppRouter = RouterService<typeof ROUTES>;
export type DaysRoute = RouteMatch<typeof ROUTES, 'days'>;
