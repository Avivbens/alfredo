import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptPassword } from './password-prompt.service';

const { showDialog, generatePassword, copyConcealed } = vi.hoisted(() => ({
  showDialog: vi.fn(),
  generatePassword: vi.fn(),
  copyConcealed: vi.fn(),
}));
vi.mock('@alfredo/dialog', () => ({ showDialog }));
vi.mock('../common/password-generator.util', () => ({ generatePassword }));
vi.mock('./clipboard.service', () => ({ copyConcealed }));

const GENERATED = 'Hk3qzP-r7Tmwd-9xLbaS';

function answer(button: string, text = ''): { button: string; text: string } {
  return { button, text };
}

function shownMessages(): string[] {
  return showDialog.mock.calls.map(([options]) => options.message);
}

describe('password-prompt.service', () => {
  beforeEach(() => {
    showDialog.mockReset();
    copyConcealed.mockReset();
    copyConcealed.mockResolvedValue(undefined);
    generatePassword.mockReset();
    generatePassword.mockReturnValue(GENERATED);
  });

  describe('promptPassword', () => {
    it('should offer Generate next to Encrypt on the first dialog', async () => {
      showDialog.mockResolvedValueOnce(answer('Cancel'));

      await promptPassword(2, 'Archive.zip');

      expect(showDialog.mock.calls[0]?.[0]).toMatchObject({
        title: 'Encrypt Files',
        buttons: ['Cancel', 'Generate', 'Encrypt'],
        defaultButton: 'Encrypt',
        answer: 'hidden',
      });
    });

    it('should copy a generated password, show it once and use it', async () => {
      showDialog.mockResolvedValueOnce(answer('Generate')).mockResolvedValueOnce(answer('Encrypt'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'generated', password: GENERATED });
      expect(copyConcealed).toHaveBeenCalledWith(GENERATED);
      expect(showDialog.mock.calls[1]?.[0]).toEqual({
        title: 'Encrypt Files',
        message: `Password copied to the clipboard:\n${GENERATED}\n\nShare it with whoever opens the zip.`,
        buttons: ['Cancel', 'Encrypt'],
        defaultButton: 'Encrypt',
      });
    });

    it('should cancel after generating when Cancel is pressed', async () => {
      showDialog.mockResolvedValueOnce(answer('Generate')).mockResolvedValueOnce(answer('Cancel'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'cancelled' });
      expect(shownMessages()[1]).toContain(GENERATED);
    });

    it('should return the password once it is typed twice', async () => {
      showDialog
        .mockResolvedValueOnce(answer('Encrypt', 'long-enough'))
        .mockResolvedValueOnce(answer('Encrypt', 'long-enough'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'typed', password: 'long-enough' });
      expect(shownMessages()).toEqual(['Password for 2 items → Archive.zip', 'Type the password again']);
      expect(showDialog.mock.calls.map(([options]) => [options.title, options.answer])).toEqual([
        ['Encrypt Files', 'hidden'],
        ['Encrypt Files', 'hidden'],
      ]);
    });

    it('should say item for a single item', async () => {
      showDialog.mockResolvedValueOnce(answer('Cancel'));

      await promptPassword(1, 'Report.pdf.zip');

      expect(shownMessages()).toEqual(['Password for 1 item → Report.pdf.zip']);
    });

    it('should ask again with the reason when the password is too short', async () => {
      showDialog
        .mockResolvedValueOnce(answer('Encrypt', 'short'))
        .mockResolvedValueOnce(answer('Encrypt', 'long-enough'))
        .mockResolvedValueOnce(answer('Encrypt', 'long-enough'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'typed', password: 'long-enough' });
      expect(shownMessages()[1]).toBe('Password for 2 items → Archive.zip\nUse at least 8 characters');
    });

    it('should start over when the second password does not match', async () => {
      showDialog
        .mockResolvedValueOnce(answer('Encrypt', 'long-enough'))
        .mockResolvedValueOnce(answer('Encrypt', 'long-enougH'))
        .mockResolvedValueOnce(answer('Encrypt', 'other-password'))
        .mockResolvedValueOnce(answer('Encrypt', 'other-password'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'typed', password: 'other-password' });
      expect(shownMessages()[2]).toBe("Password for 2 items → Archive.zip\nPasswords didn't match");
    });

    it('should cancel from the first dialog', async () => {
      showDialog.mockResolvedValueOnce(answer('Cancel'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'cancelled' });
      expect(showDialog).toHaveBeenCalledTimes(1);
    });

    it('should cancel from the second dialog', async () => {
      showDialog.mockResolvedValueOnce(answer('Encrypt', 'long-enough')).mockResolvedValueOnce(answer('Cancel'));

      const choice = await promptPassword(2, 'Archive.zip');

      expect(choice).toEqual({ kind: 'cancelled' });
      expect(showDialog).toHaveBeenCalledTimes(2);
    });
  });
});
