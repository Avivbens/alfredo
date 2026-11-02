import { z } from 'zod';

export const worktreeResultSchema = z.object({ path: z.string(), created: z.boolean() });
export type WorktreeResult = z.infer<typeof worktreeResultSchema>;
