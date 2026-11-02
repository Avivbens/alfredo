import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDirty } from './dirty.service';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));

describe('dirty.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isDirty', () => {
    it('should be dirty when git status prints anything, run without taking optional locks', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) =>
        callback(null, { stdout: ' M src/main.ts\n', stderr: '' }),
      );

      await expect(isDirty('/tmp/repo')).resolves.toBe(true);
      expect(execFile).toHaveBeenCalledWith(
        'git',
        ['--no-optional-locks', '-C', '/tmp/repo', 'status', '--porcelain'],
        { timeout: 1000 },
        expect.any(Function),
      );
    });

    it('should cap the status at the timeout it is given', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => callback(null, { stdout: '', stderr: '' }));

      await isDirty('/tmp/repo', 300);

      expect(execFile).toHaveBeenCalledWith('git', expect.any(Array), { timeout: 300 }, expect.any(Function));
    });

    it('should be clean on empty output', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => callback(null, { stdout: '', stderr: '' }));

      await expect(isDirty('/tmp/repo')).resolves.toBe(false);
    });

    it('should treat a timeout or git error as clean, so a slow repo never blocks the list', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => callback(new Error('timed out')));

      await expect(isDirty('/tmp/repo')).resolves.toBe(false);
    });
  });
});
