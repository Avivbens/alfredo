import { z } from 'zod';

export const sessionModeSchema = z.enum(['new', 'resume']);
export type SessionMode = z.infer<typeof sessionModeSchema>;
