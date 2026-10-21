import { z } from 'zod';

export const JoinOutcomeSchema = z.enum(['joining', 'already-connected']);

export type JoinOutcome = z.infer<typeof JoinOutcomeSchema>;
