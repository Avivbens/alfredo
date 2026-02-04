import { z } from 'zod';

export enum AvailableTone {
  CASUAL = 'casual',
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  HAPPY = 'happy',
  SIMPLE = 'simple',
}

export const AvailableToneSchema = z.nativeEnum(AvailableTone);
