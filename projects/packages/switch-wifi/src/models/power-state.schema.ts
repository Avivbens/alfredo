import { z } from 'zod';

export const PowerStateSchema = z.enum(['on', 'off']);

export type PowerState = z.infer<typeof PowerStateSchema>;
