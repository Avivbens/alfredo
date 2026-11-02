import { beforeEach, describe, expect, it, vi } from 'vitest';

const { access, execFile } = vi.hoisted(() => ({ access: vi.fn(), execFile: vi.fn() }));

vi.mock('node:fs/promises', () => ({ access, constants: { X_OK: 1 } }));
vi.mock('node:child_process', () => ({ execFile }));

describe('tools.service', () => {
  beforeEach(() => {
    vi.resetModules();
    access.mockReset();
    execFile.mockReset();
  });

  it("should prefer Homebrew's path", async () => {
    access.mockResolvedValue(undefined);
    const { resolveTool } = await import('./tools.service');

    expect(await resolveTool('git')).toBe('/opt/homebrew/bin/git');
    expect(await resolveTool('git')).toBe('/opt/homebrew/bin/git');
    expect(access).toHaveBeenCalledTimes(1);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('should fall back to the login shell', async () => {
    access.mockRejectedValue(new Error('ENOENT'));
    execFile.mockImplementation((_file, _args, callback) => {
      callback(null, '/custom/bin/gh\n', '');
    });
    const { resolveTool } = await import('./tools.service');

    expect(await resolveTool('gh')).toBe('/custom/bin/gh');
    expect(execFile).toHaveBeenCalledWith(expect.any(String), ['-lc', 'command -v gh'], expect.any(Function));
  });

  it('should return null when the tool is nowhere', async () => {
    access.mockRejectedValue(new Error('ENOENT'));
    execFile.mockImplementation((_file, _args, callback) => {
      callback(new Error('exit 1'), '', '');
    });
    const { resolveTool } = await import('./tools.service');

    expect(await resolveTool('gh')).toBeNull();
  });
});
