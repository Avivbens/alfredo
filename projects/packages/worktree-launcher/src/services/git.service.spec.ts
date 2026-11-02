import { dirname } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runGit } from './git.service';

const { execFile, resolveTool } = vi.hoisted(() => ({ execFile: vi.fn(), resolveTool: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));
vi.mock('./tools.service', () => ({ resolveTool }));

describe('git.service', () => {
  beforeEach(() => {
    execFile.mockReset();
    resolveTool.mockResolvedValue('/opt/homebrew/bin/git');
  });

  describe('runGit', () => {
    it('should run git with its own folder on PATH and prompts disabled', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => {
        callback(null, 'ok\n', '');
      });

      expect(await runGit('/work/app', ['status'])).toBe('ok\n');

      const [file, args, options] = execFile.mock.calls[0] ?? [];
      expect(file).toBe('/opt/homebrew/bin/git');
      expect(args).toEqual(['status']);
      expect(options.cwd).toBe('/work/app');
      expect(options.env.GIT_TERMINAL_PROMPT).toBe('0');
      expect(options.env.PATH.startsWith(`${dirname('/opt/homebrew/bin/git')}:`)).toBe(true);
    });

    it('should say git is missing without spawning anything', async () => {
      resolveTool.mockResolvedValue(null);

      await expect(runGit('/p', ['fetch'])).rejects.toThrow('git was not found');
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should report the fatal line rather than the From progress line', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => {
        callback(new Error('Command failed'), '', "From https://github.com/o/r\nfatal: couldn't find remote ref x\n");
      });

      await expect(runGit('/p', ['fetch'])).rejects.toThrow(/^fatal: couldn't find remote ref x$/);
    });

    it('should fall back to the error message when stderr is empty', async () => {
      execFile.mockImplementation((_file, _args, _options, callback) => {
        callback(new Error('spawn git ENOENT'), '', '');
      });

      await expect(runGit('/p', ['fetch'])).rejects.toThrow('spawn git ENOENT');
    });
  });
});
