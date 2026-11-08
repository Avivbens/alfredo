import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAppleScript } from '@alfredo/run-applescript';
import type { ChromeWindow, TabStrip } from '../models/chrome-tabs.schema';
import { focusChromeTab, loadChromeTabs, toSelection } from './chrome-tabs.service';

vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

describe('chrome-tabs.service', () => {
  const runAppleScriptMock = vi.mocked(runAppleScript);

  /** Trimmed from a live Chrome window with three tabs cmd-clicked: accessibility appends state to the titles. */
  const front: ChromeWindow = {
    id: 12,
    activeTabIndex: 2,
    tabs: [
      { title: 'Team Kanban - JIRA', url: 'https://jira.example.dev/kanban' },
      { title: 'Home - Google Drive', url: 'https://drive.google.com' },
      { title: 'Pull Request #15421', url: 'https://github.com/example/backend/pull/15421' },
      { title: 'Security', url: 'https://security.example.dev' },
    ],
  };
  const strip: TabStrip = {
    titles: [
      'Team Kanban - JIRA - Pinned',
      'Home - Google Drive - High memory usage - 871 MB',
      'Pull Request #15421',
      'Security',
    ],
    selected: [false, true, true, false],
  };

  function mockScripts(tabsOutput: string, stripOutput: string | Error): void {
    runAppleScriptMock.mockImplementation(async (script) => {
      if (!script.includes('AXMainWindow')) {
        return tabsOutput;
      }

      if (stripOutput instanceof Error) {
        throw stripOutput;
      }

      return stripOutput;
    });
  }

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
        selectedTabs: [],
        issues: [],
        debugLogs: [],
      });
    });

    it('should not read the tab strip unless the selection is asked for', async () => {
      runAppleScriptMock.mockResolvedValue('{"running":true,"windows":[]}');

      await loadChromeTabs();

      expect(runAppleScriptMock).toHaveBeenCalledTimes(1);
    });

    it('should return the tabs selected in the front window when the selection is asked for', async () => {
      mockScripts(JSON.stringify({ running: true, windows: [front] }), JSON.stringify(strip));

      const { selectedTabs, issues } = await loadChromeTabs({ withSelection: true });

      expect(selectedTabs).toEqual([front.tabs[1], front.tabs[2]]);
      expect(issues).toEqual([]);
    });

    it('should read the tab strip of the main window through System Events', async () => {
      mockScripts(JSON.stringify({ running: true, windows: [front] }), JSON.stringify(strip));

      await loadChromeTabs({ withSelection: true });

      const script = runAppleScriptMock.mock.calls
        .map(([source]) => source)
        .find((source) => source.includes('AXMainWindow'));
      expect(script).toMatch(/Application\(["']System Events["']\)/);
      expect(script).toContain('radioButtons');
    });

    it('should keep the tabs and log instead of adding an issue row when the tab strip cannot be read, since Accessibility may be off', async () => {
      mockScripts(
        JSON.stringify({ running: true, windows: [front] }),
        new Error('execution error: osascript is not allowed assistive access. (-1719)'),
      );

      const result = await loadChromeTabs({ withSelection: true });

      expect(result).toEqual({
        windows: [front],
        selectedTabs: [],
        issues: [],
        debugLogs: [
          "Couldn't read the selected tabs: execution error: osascript is not allowed assistive access. (-1719)",
        ],
      });
    });

    it('should name the signal when osascript is killed, since a killed process leaves no stderr', async () => {
      runAppleScriptMock.mockRejectedValue(
        Object.assign(new Error('Command failed: osascript -l JavaScript -'), { signal: 'SIGKILL', stderr: '' }),
      );

      const { issues } = await loadChromeTabs();

      expect(issues).toEqual([{ kind: 'failed', reason: 'Command failed: osascript -l JavaScript - (SIGKILL)' }]);
    });

    it('should report not-running without windows when Chrome is closed', async () => {
      runAppleScriptMock.mockResolvedValue('{"running":false}');

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], selectedTabs: [], issues: [{ kind: 'not-running' }], debugLogs: [] });
    });

    it('should report not-authorized when macOS blocks Apple events', async () => {
      runAppleScriptMock.mockRejectedValue(
        new Error('execution error: Not authorized to send Apple events to Google Chrome. (-1743)'),
      );

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], selectedTabs: [], issues: [{ kind: 'not-authorized' }], debugLogs: [] });
    });

    it('should drop windows without tabs and report no-tabs when none are left', async () => {
      runAppleScriptMock.mockResolvedValue(
        JSON.stringify({ running: true, windows: [{ id: 1, activeTabIndex: 1, tabs: [] }] }),
      );

      const result = await loadChromeTabs();

      expect(result).toEqual({ windows: [], selectedTabs: [], issues: [{ kind: 'no-tabs' }], debugLogs: [] });
    });

    it('should report failed with the reason when osascript fails for another reason', async () => {
      runAppleScriptMock.mockRejectedValue(new Error('boom'));

      const result = await loadChromeTabs();

      expect(result).toEqual({
        windows: [],
        selectedTabs: [],
        issues: [{ kind: 'failed', reason: 'boom' }],
        debugLogs: [],
      });
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

  describe('toSelection', () => {
    it('should match the strip to the tabs by position, ignoring the state accessibility appends to titles', () => {
      expect(toSelection(front, { kind: 'read', strip })).toEqual({
        selectedTabs: [front.tabs[1], front.tabs[2]],
        debugLogs: [],
      });
    });

    it('should select nothing and log the counts when they differ, as with a collapsed tab group', () => {
      const shorter: TabStrip = { titles: strip.titles.slice(1), selected: strip.selected.slice(1) };

      expect(toSelection(front, { kind: 'read', strip: shorter })).toEqual({
        selectedTabs: [],
        debugLogs: ["Couldn't match Chrome's tab strip (3 tabs) to the front window (4 tabs)"],
      });
    });

    it('should select nothing and log when a title does not match, as with an incognito window in front', () => {
      const other: TabStrip = { ...strip, titles: ['Private', ...strip.titles.slice(1)] };

      expect(toSelection(front, { kind: 'read', strip: other })).toEqual({
        selectedTabs: [],
        debugLogs: ["Couldn't match Chrome's tab strip (4 tabs) to the front window (4 tabs)"],
      });
    });

    it('should log why the strip could not be read', () => {
      expect(toSelection(front, { kind: 'failed', reason: 'boom' })).toEqual({
        selectedTabs: [],
        debugLogs: ["Couldn't read the selected tabs: boom"],
      });
    });

    it('should select nothing quietly when the selection was not asked for or there is no front window', () => {
      expect(toSelection(front, { kind: 'skipped' })).toEqual({ selectedTabs: [], debugLogs: [] });
      expect(toSelection(undefined, { kind: 'read', strip })).toEqual({ selectedTabs: [], debugLogs: [] });
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
