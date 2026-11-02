import { describe, expect, it, vi } from 'vitest';
import { runAppleScript } from '@alfredo/run-applescript';
import { copyFileToClipboard } from './clipboard.service';

vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

describe('clipboard.service', () => {
  describe('copyFileToClipboard', () => {
    it('should put a file reference on the clipboard', async () => {
      await copyFileToClipboard('/cache/gifs/3o7TKSjRrfIPjeiVyM.gif');

      expect(runAppleScript).toHaveBeenCalledWith(
        'set the clipboard to (POSIX file "/cache/gifs/3o7TKSjRrfIPjeiVyM.gif")',
      );
    });

    it('should escape the path, so a quote in it cannot end the AppleScript string early', async () => {
      await copyFileToClipboard('/Users/me/Library/Caches/"quoted"/hope.gif');

      expect(runAppleScript).toHaveBeenCalledWith(
        'set the clipboard to (POSIX file "/Users/me/Library/Caches/\\"quoted\\"/hope.gif")',
      );
    });
  });
});
