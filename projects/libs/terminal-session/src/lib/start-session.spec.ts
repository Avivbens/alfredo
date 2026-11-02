import { hoursToMilliseconds } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startSession } from './start-session';

const { runAppleScript, mkdir, writeFile, readdir, stat, unlink, execFile } = vi.hoisted(() => ({
  runAppleScript: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  execFile: vi.fn(),
}));

vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript,
}));
vi.mock('node:fs/promises', () => ({ mkdir, writeFile, readdir, stat, unlink }));
vi.mock('node:child_process', () => ({ execFile }));
vi.mock('node:os', () => ({ homedir: () => '/Users/me' }));
vi.mock('node:crypto', () => ({ randomUUID: () => 'abc' }));

const CONFIG_DIR = '/Users/me/.warp/launch_configurations';
const HOUR = hoursToMilliseconds(1);

describe('startSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execFile.mockImplementation((_file, _args, callback) => callback(null, { stdout: '', stderr: '' }));
    readdir.mockResolvedValue([]);
  });

  it('should run the AppleScript for Terminal', async () => {
    await startSession({ path: '/tmp/repo', command: 'claude', terminal: 'native' });

    expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining('do script "cd /tmp/repo && claude"'));
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should write a Warp config of its own and open it by url', async () => {
    await startSession({ path: '/tmp/repo', command: 'claude', terminal: 'warp' });

    expect(writeFile).toHaveBeenCalledWith(
      `${CONFIG_DIR}/alfredo-session-abc.yaml`,
      expect.stringContaining('cwd: "/tmp/repo"'),
    );
    expect(execFile).toHaveBeenCalledWith('open', ['warp://launch/alfredo-session-abc'], expect.any(Function));
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it("should remove only stale session configs, keeping a concurrent launch's fresh one", async () => {
    readdir.mockResolvedValue([
      'alfredo-session-old.yaml',
      'alfredo-session.yaml',
      'alfredo-session-abc.yaml',
      'alfredo-session-other.yaml',
      'mine.yaml',
    ]);
    stat.mockImplementation(async (path: string) => ({
      mtimeMs: /alfredo-session-(abc|other)\.yaml$/.test(path) ? Date.now() : Date.now() - HOUR,
    }));

    await startSession({ path: '/tmp/repo', command: 'claude', terminal: 'warp' });

    expect(unlink.mock.calls.map(([path]) => path).sort()).toEqual([
      `${CONFIG_DIR}/alfredo-session-old.yaml`,
      `${CONFIG_DIR}/alfredo-session.yaml`,
    ]);
  });

  it('should still open the session when the cleanup fails', async () => {
    readdir.mockRejectedValue(new Error('EACCES'));

    await expect(startSession({ path: '/tmp/repo', command: 'claude', terminal: 'warp' })).resolves.toBeUndefined();
    expect(execFile).toHaveBeenCalledWith('open', ['warp://launch/alfredo-session-abc'], expect.any(Function));
  });
});
