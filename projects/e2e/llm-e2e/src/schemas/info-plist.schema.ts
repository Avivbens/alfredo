import { z } from 'zod';
import { MODEL_VARIABLE } from '../common/workflow.constants';

export const InfoPlistSchema = z.object({
  userconfigurationconfig: z.array(z.looseObject({ variable: z.string() })).default([]),
});

export const ModelPopupSchema = z.object({
  type: z.literal('popupbutton'),
  variable: z.literal(MODEL_VARIABLE),
  config: z.object({
    default: z.string(),
    required: z.literal(true),
    pairs: z.array(z.tuple([z.string(), z.string()])),
  }),
});

export type ModelPopup = z.infer<typeof ModelPopupSchema>;
