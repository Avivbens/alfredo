import { z } from 'zod';

/**
 * The listening mode falls back to when Noise Cancellation is already on.
 * Noise Cancellation itself is never a valid alternate, so it is absent here.
 */
export enum AlternateMode {
  TRANSPARENCY = 'transparency',
  ADAPTIVE = 'adaptive',
  OFF = 'off',
}

export const alternateModeSchema = z.nativeEnum(AlternateMode);

export const NOISE_CANCELLATION = 'noise-cancellation';

export const activeModeSchema = z.union([alternateModeSchema, z.literal(NOISE_CANCELLATION)]);

export type ActiveMode = z.infer<typeof activeModeSchema>;
