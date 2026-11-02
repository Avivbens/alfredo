import { z } from 'zod';

export const terminalSchema = z.enum(['native', 'warp', 'iterm']);
export type Terminal = z.infer<typeof terminalSchema>;
