import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAppleScript } from './run-applescript';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));

const ORIGINAL_PLATFORM = process.platform;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', { value: platform });
}

describe('run-applescript', () => {
  describe('runAppleScript', () => {
    beforeEach(() => {
      setPlatform('darwin');
      execFile.mockReset();
      execFile.mockImplementation((_file, _args, cb) => cb(null, { stdout: ' out \n', stderr: '' }));
    });

    afterEach(() => {
      setPlatform(ORIGINAL_PLATFORM);
    });

    it('should run AppleScript with only the script by default', async () => {
      await runAppleScript('return 1');

      expect(execFile).toHaveBeenCalledWith('osascript', ['-e', 'return 1'], expect.any(Function));
    });

    it('should select JavaScript with -l before the script', async () => {
      await runAppleScript('run()', { language: 'JavaScript' });

      expect(execFile).toHaveBeenCalledWith('osascript', ['-l', 'JavaScript', '-e', 'run()'], expect.any(Function));
    });

    it('should put -ss before the script when output is not human readable', async () => {
      await runAppleScript('run()', { language: 'JavaScript', humanReadableOutput: false });

      expect(execFile).toHaveBeenCalledWith(
        'osascript',
        ['-l', 'JavaScript', '-ss', '-e', 'run()'],
        expect.any(Function),
      );
    });

    it('should pass arguments verbatim after the script, since no shell parses them', async () => {
      const json = JSON.stringify({ title: `it's "quoted"\nשלום` });

      await runAppleScript('run()', { language: 'JavaScript', args: [json] });

      expect(execFile).toHaveBeenCalledWith(
        'osascript',
        ['-l', 'JavaScript', '-e', 'run()', json],
        expect.any(Function),
      );
    });

    it('should return trimmed stdout', async () => {
      expect(await runAppleScript('return 1')).toBe('out');
    });

    it('should reject when osascript fails', async () => {
      execFile.mockImplementationOnce((_file, _args, cb) => cb(new Error('execution error: -1743')));

      await expect(runAppleScript('return 1')).rejects.toThrow('-1743');
    });

    it('should throw macOS only off darwin without spawning', async () => {
      setPlatform('linux');

      await expect(runAppleScript('return 1')).rejects.toThrow('macOS only');
      expect(execFile).not.toHaveBeenCalled();
    });
  });
});
