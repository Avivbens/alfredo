import { z } from 'zod';

export const dialogResultSchema = z.object({ button: z.string(), text: z.string() });
export type DialogResult = z.infer<typeof dialogResultSchema>;

/** `answer` adds a text field: `text` shows what is typed, `hidden` masks it like a password field */
export type DialogOptions = {
  title: string;
  message: string;
  buttons: string[];
  defaultButton: string;
  answer?: 'text' | 'hidden';
};
