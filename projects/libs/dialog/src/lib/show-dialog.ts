import { runAppleScript } from '@alfredo/run-applescript';
import { dialogResultSchema } from './dialog.schema';
import type { DialogOptions, DialogResult } from './dialog.schema';

/**
 * The app that owns the dialog. It must take keyboard focus, or a typed answer lands in whatever app was in front;
 * the Alfred dialog spike (alfredo-specs/spikes/encrypt-files) decides between this and `Application('System Events')`.
 */
const DIALOG_TARGET = 'Application.currentApplication()';

/** JXA's error number when the user presses Cancel */
const USER_CANCELED = -128;

const ANSWER_FIELDS = {
  text: { defaultAnswer: '' },
  hidden: { defaultAnswer: '', hiddenAnswer: true },
};

/** Every value goes in through `JSON.stringify`, so quotes, backslashes and newlines can't break the script */
export function buildDialogScript({ title, message, buttons, defaultButton, answer }: DialogOptions): string {
  const answerFields = answer ? ANSWER_FIELDS[answer] : {};
  const options = { withTitle: title, buttons, defaultButton, ...answerFields };

  return `
const app = ${DIALOG_TARGET};
app.includeStandardAdditions = true;
app.activate();
let result;
try {
  const reply = app.displayDialog(${JSON.stringify(message)}, ${JSON.stringify(options)});
  result = { button: reply.buttonReturned, text: reply.textReturned ?? '' };
} catch (error) {
  if (error.errorNumber !== ${USER_CANCELED}) {
    throw error;
  }
  result = { button: 'Cancel', text: '' };
}
JSON.stringify(result);
`;
}

/** The raw answer can hold a typed secret, and a parse error would quote it to whoever shows the error */
function parseDialogResult(raw: string): DialogResult {
  try {
    return dialogResultSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error('The dialog answered in an unexpected way');
  }
}

export async function showDialog(options: DialogOptions): Promise<DialogResult> {
  const script = buildDialogScript(options);
  const raw = await runAppleScript(script, { language: 'JavaScript' });

  return parseDialogResult(raw);
}
