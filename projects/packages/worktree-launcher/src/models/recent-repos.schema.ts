import { z } from 'zod';

export const recentReposSchema = z.array(z.string());
export type RecentRepos = z.infer<typeof recentReposSchema>;
