import { z } from 'zod';

export enum MapProvider {
  OFF = 'off',
  GOOGLE_MAPS = 'google_maps',
  APPLE_MAPS = 'apple_maps',
}

export const MapProviderSchema = z.nativeEnum(MapProvider);
