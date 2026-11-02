import { type RouteMatch, type RouterService, defineRoutes } from 'fast-alfred';
import { z } from 'zod';

export const ROUTES = defineRoutes({
  'pick-repo': { schema: z.object({ branch: z.string() }), marker: '›' },
});

export type AppRouter = RouterService<typeof ROUTES>;
export type PickRepoRoute = RouteMatch<typeof ROUTES, 'pick-repo'>;
