import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Clone } from '../../models/clone.schema';
import { getTrunk } from './trunk.service';

const { execFile, resolveTool } = vi.hoisted(() => ({ execFile: vi.fn(), resolveTool: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));
vi.mock('../system/tools.service', () => ({ resolveTool }));

const GIT = '/opt/homebrew/bin/git';
const GH = '/opt/homebrew/bin/gh';
const CWD = '/work/app';
const CLONE: Clone = { path: CWD, nameWithOwner: 'owner/app' };

function gitFails(): Error {
  return Object.assign(new Error('Command failed'), { code: 128 });
}

/** Answers `symbolic-ref` with `head` (or fails it when null) and `gh` with `ghOutput`. */
function answer(head: string | null, ghOutput = 'main\n'): void {
  execFile.mockImplementation((file: string, _args: string[], ...rest: unknown[]) => {
    const callback = rest.at(-1) as (...results: unknown[]) => void;
    if (file === GH) {
      callback(null, ghOutput, '');

      return;
    }
    if (head === null) {
      callback(gitFails(), '', 'fatal: ref refs/remotes/origin/HEAD is not a symbolic ref\n');

      return;
    }
    callback(null, head, '');
  });
}

describe('trunk.service', () => {
  beforeEach(() => {
    execFile.mockReset();
    resolveTool.mockReset();
    resolveTool.mockImplementation(async (name: string) => (name === 'git' ? GIT : GH));
  });

  describe('getTrunk', () => {
    it('should read origin/HEAD', async () => {
      answer('refs/remotes/origin/develop\n');

      expect(await getTrunk(CLONE)).toBe('develop');
      expect(execFile).toHaveBeenCalledTimes(1);
      expect(execFile.mock.calls[0]?.[1]).toEqual(['symbolic-ref', 'refs/remotes/origin/HEAD']);
      expect(execFile.mock.calls[0]?.[2]).toEqual(expect.objectContaining({ cwd: CWD }));
    });

    it('should not look for gh when origin/HEAD answers', async () => {
      answer('refs/remotes/origin/main\n');

      await getTrunk(CLONE);

      expect(resolveTool).not.toHaveBeenCalledWith('gh');
    });

    it('should keep a trunk name that holds a slash', async () => {
      answer('refs/remotes/origin/release/2\n');

      expect(await getTrunk(CLONE)).toBe('release/2');
    });

    it('should read the full ref, so a local branch named origin/main cannot shadow it', async () => {
      answer('refs/remotes/origin/main\n');

      expect(await getTrunk(CLONE)).toBe('main');
      expect(execFile.mock.calls[0]?.[1]).not.toContain('--short');
    });

    it('should fall back to gh', async () => {
      answer(null, 'main\n');

      expect(await getTrunk(CLONE)).toBe('main');
      expect(execFile.mock.calls[1]?.[0]).toBe(GH);
      expect(execFile.mock.calls[1]?.[1]).toEqual([
        'repo',
        'view',
        'owner/app',
        '--json',
        'defaultBranchRef',
        '-q',
        '.defaultBranchRef.name',
      ]);
    });

    it('should explain what is missing when origin/HEAD is unset and gh is not installed', async () => {
      answer(null);
      resolveTool.mockImplementation(async (name: string) => (name === 'git' ? GIT : null));

      await expect(getTrunk(CLONE)).rejects.toThrow('gh was not found');
    });

    it('should report missing git instead of asking gh', async () => {
      resolveTool.mockResolvedValue(null);

      await expect(getTrunk(CLONE)).rejects.toThrow('git was not found');
      expect(execFile).not.toHaveBeenCalled();
    });

    it('should surface the first stderr line when gh fails', async () => {
      execFile.mockImplementation((file: string, _args: string[], ...rest: unknown[]) => {
        const callback = rest.at(-1) as (...results: unknown[]) => void;
        callback(
          Object.assign(new Error('Command failed'), { code: 1 }),
          '',
          file === GH ? '\nfailed to determine base repo\nmore\n' : 'fatal: no\n',
        );
      });

      await expect(getTrunk(CLONE)).rejects.toThrow(/^failed to determine base repo$/);
    });

    it('should fail when gh answers with nothing', async () => {
      answer(null, '\n');

      await expect(getTrunk(CLONE)).rejects.toThrow('default branch');
    });
  });
});
