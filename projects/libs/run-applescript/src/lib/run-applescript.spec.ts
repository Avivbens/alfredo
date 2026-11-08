import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAppleScript } from './run-applescript';

const { execFileAsync, stdinEnd } = vi.hoisted(() => ({ execFileAsync: vi.fn(), stdinEnd: vi.fn() }));

/** The real `execFile` carries a custom promisified form whose promise holds the child, so the mock does too. */
vi.mock('node:child_process', () => ({
  execFile: Object.assign(vi.fn(), { [Symbol.for('nodejs.util.promisify.custom')]: execFileAsync }),
}));

const ORIGINAL_PLATFORM = process.platform;

function setPlatform(platform: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', { value: platform });
}

function toExecution(result: Promise<unknown>): Promise<unknown> {
  return Object.assign(result, { child: { stdin: { end: stdinEnd } } });
}

describe('run-applescript', () => {
  describe('runAppleScript', () => {
    beforeEach(() => {
      setPlatform('darwin');
      execFileAsync.mockReset();
      stdinEnd.mockReset();
      execFileAsync.mockImplementation(() => toExecution(Promise.resolve({ stdout: ' out \n', stderr: '' })));
    });

    afterEach(() => {
      setPlatform(ORIGINAL_PLATFORM);
    });

    it('should run AppleScript read from stdin by default', async () => {
      await runAppleScript('return 1');

      expect(execFileAsync).toHaveBeenCalledWith('osascript', ['-']);
      expect(stdinEnd).toHaveBeenCalledWith('return 1');
    });

    it('should keep a long script off the command line, since security agents kill osascript runs that carry one', async () => {
      const script = `return "${'x'.repeat(4096)}"`;

      await runAppleScript(script);

      expect(JSON.stringify(execFileAsync.mock.calls[0]?.[1])).not.toContain('xxxx');
      expect(stdinEnd).toHaveBeenCalledWith(script);
    });

    it('should select JavaScript with -l before the script', async () => {
      await runAppleScript('run()', { language: 'JavaScript' });

      expect(execFileAsync).toHaveBeenCalledWith('osascript', ['-l', 'JavaScript', '-']);
    });

    it('should put -ss before the script when output is not human readable', async () => {
      await runAppleScript('run()', { language: 'JavaScript', humanReadableOutput: false });

      expect(execFileAsync).toHaveBeenCalledWith('osascript', ['-l', 'JavaScript', '-ss', '-']);
    });

    it('should pass arguments verbatim after the script, since no shell parses them', async () => {
      const json = JSON.stringify({ title: `it's "quoted"\nשלום` });

      await runAppleScript('run()', { language: 'JavaScript', args: [json] });

      expect(execFileAsync).toHaveBeenCalledWith('osascript', ['-l', 'JavaScript', '-', json]);
    });

    it('should return trimmed stdout', async () => {
      expect(await runAppleScript('return 1')).toBe('out');
    });

    it('should reject when osascript fails', async () => {
      execFileAsync.mockImplementationOnce(() => toExecution(Promise.reject(new Error('execution error: -1743'))));

      await expect(runAppleScript('return 1')).rejects.toThrow('-1743');
    });

    it('should throw macOS only off darwin without spawning', async () => {
      setPlatform('linux');

      await expect(runAppleScript('return 1')).rejects.toThrow('macOS only');
      expect(execFileAsync).not.toHaveBeenCalled();
    });
  });
});
