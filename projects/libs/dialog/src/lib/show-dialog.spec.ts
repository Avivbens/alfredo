import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DialogOptions } from './dialog.schema';
import { buildDialogScript, showDialog } from './show-dialog';

const { runAppleScript } = vi.hoisted(() => ({ runAppleScript: vi.fn() }));
vi.mock('@alfredo/run-applescript', () => ({ runAppleScript }));

type DialogReply = { buttonReturned: string; textReturned?: string };

/** A stand-in for JXA's scripting bridge: records the calls the script makes on the app that shows the dialog */
function createFakeJxa(reply: () => DialogReply) {
  const calls: string[] = [];
  const dialogs: { message: string; options: Record<string, unknown> }[] = [];
  const app = {
    includeStandardAdditions: false,
    activate: () => calls.push('activate'),
    displayDialog: (message: string, options: Record<string, unknown>) => {
      calls.push('displayDialog');
      dialogs.push({ message, options });
      return reply();
    },
  };
  const Application = Object.assign(() => app, { currentApplication: () => app });

  return { app, calls, dialogs, context: { Application } };
}

const PASSWORD_DIALOG: DialogOptions = {
  title: 'Encrypt Files',
  message: 'Password for 2 items → Archive.zip',
  buttons: ['Cancel', 'Encrypt'],
  defaultButton: 'Encrypt',
  answer: 'hidden',
};

describe('show-dialog', () => {
  describe('buildDialogScript', () => {
    it('should bring the dialog app forward before asking, so typing lands in the dialog', () => {
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt', textReturned: 'pw' }));

      runInNewContext(buildDialogScript(PASSWORD_DIALOG), jxa.context);

      expect(jxa.calls).toEqual(['activate', 'displayDialog']);
      expect(jxa.app.includeStandardAdditions).toBe(true);
    });

    it('should show quotes, backslashes, newlines and emoji in the message and title unchanged', () => {
      const message = 'Password for 1 item → Tax "2025" ✨\\ מס.pdf.zip\nUse at least 8 characters';
      const title = 'A "quoted" ✨ title';
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt', textReturned: 'pw' }));

      runInNewContext(buildDialogScript({ ...PASSWORD_DIALOG, title, message }), jxa.context);

      expect(jxa.dialogs[0]?.message).toBe(message);
      expect(jxa.dialogs[0]?.options).toMatchObject({ withTitle: title });
    });

    it('should ask for a masked answer when the answer is hidden', () => {
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt', textReturned: 'pw' }));

      runInNewContext(buildDialogScript(PASSWORD_DIALOG), jxa.context);

      expect(jxa.dialogs[0]?.options).toEqual({
        withTitle: 'Encrypt Files',
        buttons: ['Cancel', 'Encrypt'],
        defaultButton: 'Encrypt',
        defaultAnswer: '',
        hiddenAnswer: true,
      });
    });

    it('should ask for a visible answer when the answer is text', () => {
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt', textReturned: 'name' }));

      runInNewContext(buildDialogScript({ ...PASSWORD_DIALOG, answer: 'text' }), jxa.context);

      expect(jxa.dialogs[0]?.options).toEqual({
        withTitle: 'Encrypt Files',
        buttons: ['Cancel', 'Encrypt'],
        defaultButton: 'Encrypt',
        defaultAnswer: '',
      });
    });

    it('should show no answer field when no answer is asked for', () => {
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt' }));
      const withoutAnswer: DialogOptions = {
        title: 'Encrypt Files',
        message: 'Password copied to the clipboard',
        buttons: ['Cancel', 'Encrypt'],
        defaultButton: 'Encrypt',
      };

      const output = runInNewContext(buildDialogScript(withoutAnswer), jxa.context);

      expect(jxa.dialogs[0]?.options).toEqual({
        withTitle: 'Encrypt Files',
        buttons: ['Cancel', 'Encrypt'],
        defaultButton: 'Encrypt',
      });
      expect(JSON.parse(output)).toEqual({ button: 'Encrypt', text: '' });
    });

    it('should return the pressed button and the typed text as JSON', () => {
      const jxa = createFakeJxa(() => ({ buttonReturned: 'Encrypt', textReturned: 'long-enough' }));

      const output = runInNewContext(buildDialogScript(PASSWORD_DIALOG), jxa.context);

      expect(JSON.parse(output)).toEqual({ button: 'Encrypt', text: 'long-enough' });
    });

    it('should report a cancelled dialog as the Cancel button', () => {
      const jxa = createFakeJxa(() => {
        throw Object.assign(new Error('User canceled.'), { errorNumber: -128 });
      });

      const output = runInNewContext(buildDialogScript(PASSWORD_DIALOG), jxa.context);

      expect(JSON.parse(output)).toEqual({ button: 'Cancel', text: '' });
    });

    it('should let any other dialog error through', () => {
      const jxa = createFakeJxa(() => {
        throw Object.assign(new Error('Not authorized'), { errorNumber: -1743 });
      });

      const run = () => runInNewContext(buildDialogScript(PASSWORD_DIALOG), jxa.context);

      expect(run).toThrow('Not authorized');
    });
  });

  describe('showDialog', () => {
    beforeEach(() => {
      runAppleScript.mockReset();
    });

    it('should run the script as JXA with nothing on the command line', async () => {
      runAppleScript.mockResolvedValue('{"button":"Encrypt","text":"pw"}');

      await showDialog(PASSWORD_DIALOG);

      expect(runAppleScript).toHaveBeenCalledWith(buildDialogScript(PASSWORD_DIALOG), { language: 'JavaScript' });
    });

    it('should parse the dialog result', async () => {
      runAppleScript.mockResolvedValue('{"button":"Encrypt","text":"pw"}');

      const result = await showDialog(PASSWORD_DIALOG);

      expect(result).toEqual({ button: 'Encrypt', text: 'pw' });
    });

    it.each([
      ['output that is not JSON', 'secret-password-123 {"button":"Encrypt"'],
      ['JSON of the wrong shape', '{"button":"Encrypt","text":["secret-password-123"]}'],
    ])('should never echo the typed answer in its error for %s, since callers may show errors', async (_, raw) => {
      runAppleScript.mockResolvedValue(raw);

      const failure = await showDialog(PASSWORD_DIALOG).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe('The dialog answered in an unexpected way');
    });
  });
});
