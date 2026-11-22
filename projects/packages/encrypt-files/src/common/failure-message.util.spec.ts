import { describe, expect, it } from 'vitest';
import { toFailureMessage } from './failure-message.util';

function systemError(code: string, path: string, message = `${code}: failed`): Error {
  return Object.assign(new Error(message), { code, path });
}

describe('failure-message.util', () => {
  describe('toFailureMessage', () => {
    it('should say the disk is full', () => {
      const message = toFailureMessage(systemError('ENOSPC', '/t/.Archive.zip.partial'));

      expect(message).toBe("Couldn't encrypt - the disk is full");
    });

    it.each(['EACCES', 'EPERM'])('should name the file it may not read on %s', (code) => {
      const message = toFailureMessage(systemError(code, '/t/Photos/a.jpg'));

      expect(message).toBe("Couldn't encrypt - no permission to read a.jpg");
    });

    it('should name a file that disappeared', () => {
      const message = toFailureMessage(systemError('ENOENT', '/t/Photos/a.jpg'));

      expect(message).toBe("Couldn't encrypt - a.jpg is gone");
    });

    it('should fall back to the error message', () => {
      const message = toFailureMessage(new Error('Not authorized to send Apple events'));

      expect(message).toBe("Couldn't encrypt - Not authorized to send Apple events");
    });

    it('should cope with a thrown non-error', () => {
      const message = toFailureMessage('boom');

      expect(message).toBe("Couldn't encrypt - boom");
    });
  });
});
