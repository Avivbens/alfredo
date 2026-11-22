import { z } from 'zod';

/** A macOS dialog shows at most three buttons */
const MAX_BUTTONS = 3;

export const CANCEL_BUTTON = 'Cancel';

export const dialogOptionsSchema = z.object({
  title: z.string(),
  message: z.string(),
  buttons: z.array(z.string()).min(1).max(MAX_BUTTONS),
  defaultButton: z.string(),
  /** `text` shows what is typed, `hidden` masks it like a password field */
  answer: z.enum(['text', 'hidden']).optional(),
});

export const dialogResultSchema = z.object({ button: z.string(), text: z.string() });

/** `Button` ties the default and the pressed button to the buttons the dialog actually shows */
export type DialogOptions<Button extends string = string> = Omit<
  z.input<typeof dialogOptionsSchema>,
  'buttons' | 'defaultButton'
> & {
  buttons: readonly Button[];
  defaultButton: NoInfer<Button>;
};

export type DialogResult<Button extends string = string> = Omit<z.infer<typeof dialogResultSchema>, 'button'> & {
  button: Button | typeof CANCEL_BUTTON;
};
