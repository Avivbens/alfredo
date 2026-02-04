import { z } from 'zod';

export enum OpenEventPlatform {
  GOOGLE_CALENDAR = 'google_calendar',
  APPLE_CALENDAR = 'apple_calendar',
}

export const OpenEventPlatformSchema = z.nativeEnum(OpenEventPlatform);
