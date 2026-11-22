import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promptPassword } from './password-prompt.service';

const { showDialog } = vi.hoisted(() => ({ showDialog: vi.fn() }));
vi.mock('@alfredo/dialog', () => ({ showDialog }));

function answer(button: string, text = ''): { button: string; text: string } {
  return { button, text };
}

function shownMessages(): string[] {
  return showDialog.mock.calls.map(([options]) => options.message);
}

describe('password-prompt.service', () => {
  beforeEach(() => {
    showDialog.mockReset();
  });

  describe('promptPassword', () => {
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
