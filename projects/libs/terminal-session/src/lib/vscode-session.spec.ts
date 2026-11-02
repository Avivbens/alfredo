import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VSCODE_EXTENSION_WAIT_MS,
  findLatestSessionId,
  startVSCodeSession,
  toAgentChatUrl,
  toAgentProjectDir,
} from './vscode-session';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));

describe('vscode-session', () => {
  describe('toAgentProjectDir', () => {
    it('should replace every non-alphanumeric character with a dash', () => {
      expect(toAgentProjectDir('/Users/me', '/Users/avbensha/dev/contribute/alfredo@worktree-flow')).toBe(
        '/Users/me/.claude/projects/-Users-avbensha-dev-contribute-alfredo-worktree-flow',
      );
    });
  });

  describe('findLatestSessionId', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'vscode-session-'));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('should pick the newest session by mtime even within the same second', async () => {
      await writeFile(join(dir, 'older.jsonl'), '');
      await writeFile(join(dir, 'newer.jsonl'), '');
      await utimes(join(dir, 'older.jsonl'), 1000.1, 1000.1);
      await utimes(join(dir, 'newer.jsonl'), 1000.9, 1000.9);

      await expect(findLatestSessionId(dir)).resolves.toBe('newer');
    });

    it('should ignore files that are not jsonl', async () => {
      await writeFile(join(dir, 'a.jsonl'), '');
      await writeFile(join(dir, 'b.txt'), '');
      await utimes(join(dir, 'a.jsonl'), 1000, 1000);
      await utimes(join(dir, 'b.txt'), 2000, 2000);

      await expect(findLatestSessionId(dir)).resolves.toBe('a');
    });

    it('should be null for a missing folder', async () => {
      await expect(findLatestSessionId(join(dir, 'missing'))).resolves.toBeNull();
    });

    it('should be null for an empty folder', async () => {
      await expect(findLatestSessionId(dir)).resolves.toBeNull();
    });
  });

  describe('toAgentChatUrl', () => {
    it('should open a new chat without a session', () => {
      expect(toAgentChatUrl()).toBe('vscode://anthropic.claude-code/open');
      expect(toAgentChatUrl(null)).toBe('vscode://anthropic.claude-code/open');
    });

    it('should encode the session id', () => {
      expect(toAgentChatUrl('a b/c')).toBe('vscode://anthropic.claude-code/open?session=a%20b%2Fc');
    });
  });

  describe('startVSCodeSession', () => {
    let home: string;
    const path = '/work/repo';

    beforeEach(async () => {
      vi.clearAllMocks();
      vi.useFakeTimers();
      execFile.mockImplementation((_file, _args, callback) => callback(null, { stdout: '', stderr: '' }));
      home = await mkdtemp(join(tmpdir(), 'vscode-home-'));
    });

    afterEach(async () => {
      vi.useRealTimers();
      await rm(home, { recursive: true, force: true });
    });

    it('should open the folder first and send the new-chat url only after the wait', async () => {
      const done = startVSCodeSession({ path, mode: 'new', home });

      await vi.advanceTimersByTimeAsync(VSCODE_EXTENSION_WAIT_MS - 1);
      expect(execFile).toHaveBeenCalledTimes(1);
      expect(execFile).toHaveBeenCalledWith('open', ['-a', 'Visual Studio Code', path], expect.any(Function));

      await vi.advanceTimersByTimeAsync(1);
      await done;
      expect(execFile).toHaveBeenCalledTimes(2);
      expect(execFile).toHaveBeenLastCalledWith('open', ['vscode://anthropic.claude-code/open'], expect.any(Function));
    });

    it('should resume the newest session of that folder', async () => {
      const projectDir = toAgentProjectDir(home, path);
      await mkdir(projectDir, { recursive: true });
      await writeFile(join(projectDir, 'old.jsonl'), '');
      await writeFile(join(projectDir, 'new.jsonl'), '');
      await utimes(join(projectDir, 'old.jsonl'), 1000, 1000);
      await utimes(join(projectDir, 'new.jsonl'), 2000, 2000);

      const done = startVSCodeSession({ path, mode: 'resume', home });
      await vi.advanceTimersByTimeAsync(VSCODE_EXTENSION_WAIT_MS);
      await done;

      expect(execFile).toHaveBeenLastCalledWith(
        'open',
        ['vscode://anthropic.claude-code/open?session=new'],
        expect.any(Function),
      );
    });

    it('should start a new chat when the folder has no session', async () => {
      const done = startVSCodeSession({ path, mode: 'resume', home });
      await vi.advanceTimersByTimeAsync(VSCODE_EXTENSION_WAIT_MS);
      await done;

      expect(execFile).toHaveBeenLastCalledWith('open', ['vscode://anthropic.claude-code/open'], expect.any(Function));
    });
  });
});
