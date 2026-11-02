import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAppleScript } from '@alfredo/run-applescript';
import { focusChromeTab, loadChromeTabs } from './chrome-tabs.service';

vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

describe('chrome-tabs.service', () => {
  const runAppleScriptMock = vi.mocked(runAppleScript);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loadChromeTabs', () => {
    it('should run the read script as JavaScript', async () => {
      runAppleScriptMock.mockResolvedValue('{"running":true,"windows":[]}');

      await loadChromeTabs();

      expect(runAppleScriptMock).toHaveBeenCalledWith(expect.stringContaining('running()'), {
        language: 'JavaScript',
      });
    });

    it('should check running() before windows() and skip incognito windows', async () => {
      runAppleScriptMock.mockResolvedValue('{"running":false}');

      await loadChromeTabs();

      const script = runAppleScriptMock.mock.calls[0]?.[0] ?? '';
      expect(script.indexOf('running()')).toBeGreaterThanOrEqual(0);
      expect(script.indexOf('running()')).toBeLessThan(script.indexOf('windows('));
      expect(script).toMatch(/mode\(\) !== ["']incognito["']/);
    });

    it('should return the windows of a running Chrome', async () => {
      runAppleScriptMock.mockResolvedValue(
        JSON.stringify({
          running: true,
          windows: [{ id: 12, activeTabIndex: 1, tabs: [{ title: 'Alfredo', url: 'https://alfredo.dev' }] }],
        }),
      );

      const result = await loadChromeTabs();

      expect(result).toEqual({
        windows: [{ id: 12, activeTabIndex: 1, tabs: [{ title: 'Alfredo', url: 'https://alfredo.dev' }] }],
        issues: [],
      });
    });

    it('should report not-running without windows when Chrome is closed', async () => {
      runAppleScriptMock.mockResolvedValue('{"running":false}');

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], issues: [{ kind: 'not-running' }] });
    });

    it('should report not-authorized when macOS blocks Apple events', async () => {
      runAppleScriptMock.mockRejectedValue(
        new Error('execution error: Not authorized to send Apple events to Google Chrome. (-1743)'),
      );

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], issues: [{ kind: 'not-authorized' }] });
    });

    it('should drop windows without tabs and report no-tabs when none are left', async () => {
      runAppleScriptMock.mockResolvedValue(
        JSON.stringify({ running: true, windows: [{ id: 1, activeTabIndex: 1, tabs: [] }] }),
      );

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], issues: [{ kind: 'no-tabs' }] });
    });

    it('should report failed with the reason when osascript fails for another reason', async () => {
      runAppleScriptMock.mockRejectedValue(new Error('boom'));

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], issues: [{ kind: 'failed', reason: 'boom' }] });
    });

    it('should prefer the trimmed stderr over the command line in the message', async () => {
      runAppleScriptMock.mockRejectedValue(
        Object.assign(new Error('Command failed: osascript -l JavaScript -e ...'), {
          stderr: 'execution error: Error: boom (-2700)\n',
        }),
      );

      const result = await loadChromeTabs();

      expect(result.issues).toEqual([{ kind: 'failed', reason: 'execution error: Error: boom (-2700)' }]);
    });

    it('should report not-authorized when only stderr carries -1743', async () => {
      runAppleScriptMock.mockRejectedValue(
        Object.assign(new Error('Command failed: osascript'), { stderr: 'execution error: Not authorized (-1743)' }),
      );

      const result = await loadChromeTabs();

      expect(result.issues).toEqual([{ kind: 'not-authorized' }]);
    });

    it('should report malformed output as failed with a prettified zod error instead of its JSON message', async () => {
      runAppleScriptMock.mockResolvedValue('{"windows":[]}');

      const { windows, issues } = await loadChromeTabs();

      expect(windows).toEqual([]);
      expect(issues).toEqual([{ kind: 'failed', reason: expect.stringContaining('running') }]);
      expect(JSON.stringify(issues)).not.toContain('"code"');
    });
  });

  describe('focusChromeTab', () => {
    it('should look the window up by its text id, skip a quit Chrome and unminimize', async () => {
      runAppleScriptMock.mockResolvedValue('');

      await focusChromeTab(12, 3);

      const script = runAppleScriptMock.mock.calls[0]?.[0] ?? '';
      expect(script).toContain('chrome.windows.byId(String(windowId))');
      expect(script.indexOf('running()')).toBeLessThan(script.indexOf('windows.byId'));
      expect(script.indexOf('minimized = false')).toBeLessThan(script.indexOf('index = 1'));
    });

    it('should pass the window id and tab index to the focus script as one JSON argument', async () => {
      runAppleScriptMock.mockResolvedValue('');

      await focusChromeTab(12, 3);

      expect(runAppleScriptMock).toHaveBeenCalledWith(expect.stringContaining('activate()'), {
        language: 'JavaScript',
        args: ['{"windowId":12,"tabIndex":3}'],
      });
    });
  });
});
