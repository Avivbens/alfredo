import { type RouteMatch, type RouterService, defineRoutes } from 'fast-alfred';
import { z } from 'zod';

export const ROUTES = defineRoutes({
  worktrees: { schema: z.object({ repoPath: z.string() }), marker: '⎇' },
});

export type AppRouter = RouterService<typeof ROUTES>;
export type WorktreesRoute = RouteMatch<typeof ROUTES, 'worktrees'>;
