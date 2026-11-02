import { z } from 'zod';

export const cloneSchema = z.object({ path: z.string(), nameWithOwner: z.string() });
export type Clone = z.infer<typeof cloneSchema>;
