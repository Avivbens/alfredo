import { z } from 'zod';

export const AuthStatusSchema = z.enum(['Authorized', 'Denied', 'Restricted', 'Not Determined']);
