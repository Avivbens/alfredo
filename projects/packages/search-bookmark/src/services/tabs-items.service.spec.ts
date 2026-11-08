import { describe, expect, it } from 'vitest';
import { focusTabArgsSchema } from '../models/chrome-tabs.schema';
import type { ChromeWindow } from '../models/chrome-tabs.schema';
import { loadTabsOutput, toIssueItem, toScopeItems, toSearchedTabs, toTabItems } from './tabs-items.service';

function buildWindow(id: number, tabCount: number, activeTabIndex = 1): ChromeWindow {
  return {
    id,
    activeTabIndex,
    tabs: Array.from({ length: tabCount }, (_, index) => ({
      title: `Tab ${id}-${index + 1}`,
      url: `https://example.dev/${id}/${index + 1}`,
    })),
  };
}

describe('tabs-items.service', () => {
  const settings = { sliceAmount: 10, fuzzyThreshold: 0.4 };

  describe('toScopeItems', () => {
    const windows = [buildWindow(11, 12, 2), buildWindow(22, 9, 3), buildWindow(33, 10)];

    it('should show the current tab and front window rows when one window is open', () => {
      const items = toScopeItems([buildWindow(1, 5)]);

      expect(items.map(({ title }) => title)).toEqual(['Copy current tab', 'Copy this window']);
      expect(items.map(({ subtitle }) => subtitle)).toEqual(['Tab 1-1', '5 tabs · the window in front']);
    });

    it('should show current tab, front, all, then windows 2 to N when several are open', () => {
      const items = toScopeItems(windows);

      expect(items.map(({ title }) => title)).toEqual([
        'Copy current tab',
        'Copy this window',
        'Copy all windows',
        'Copy another window',
        'Copy another window',
      ]);
      expect(items.map(({ subtitle }) => subtitle)).toEqual([
        'Tab 11-2',
        '12 tabs · the window in front',
        '31 tabs in 3 windows',
        '9 tabs · showing "Tab 22-3"',
        '10 tabs · showing "Tab 33-1"',
      ]);
    });

    it('should use singular counts for one tab', () => {
      const one = toScopeItems([buildWindow(1, 1)]);
      const two = toScopeItems([buildWindow(1, 1), buildWindow(2, 1)]);

      expect(one.map(({ subtitle }) => subtitle)).toEqual(['Tab 1-1', '1 tab · the window in front']);
      expect(two.map(({ subtitle }) => subtitle)).toEqual([
        'Tab 1-1',
        '1 tab · the window in front',
        '2 tabs in 2 windows',
        '1 tab · showing "Tab 2-1"',
      ]);
    });

    it('should fall back to the url when the current tab has no title', () => {
      const [current] = toScopeItems([
        { id: 1, activeTabIndex: 1, tabs: [{ title: '', url: 'https://example.dev/a' }] },
      ]);

      expect(current?.subtitle).toBe('https://example.dev/a');
      expect(current?.arg).toBe('[https://example.dev/a](https://example.dev/a)');
    });

    it('should leave out the current tab row when the active tab index is out of range', () => {
      const items = toScopeItems([buildWindow(1, 2, 5)]);

      expect(items.map(({ title }) => title)).toEqual(['Copy this window']);
    });

    it('should copy the matching markdown on each scope row', () => {
      const [current, front, all, second] = toScopeItems([buildWindow(1, 1), buildWindow(2, 1)]);

      expect(current?.arg).toBe('[Tab 1-1](https://example.dev/1/1)');
      expect(front?.arg).toBe('- [Tab 1-1](https://example.dev/1/1)');
      expect(all?.arg).toBe(
        '### Window 1\n\n- [Tab 1-1](https://example.dev/1/1)\n\n### Window 2\n\n- [Tab 2-1](https://example.dev/2/1)',
      );
      expect(second?.arg).toBe('- [Tab 2-1](https://example.dev/2/1)');
    });

    it('should fall back to the url when the active tab of another window has no title', () => {
      const [, , , row] = toScopeItems([
        buildWindow(1, 1),
        { id: 2, activeTabIndex: 1, tabs: [{ title: '', url: 'https://example.dev/b' }] },
      ]);

      expect(row?.title).toBe('Copy another window');
      expect(row?.subtitle).toBe('1 tab · showing "https://example.dev/b"');
    });

    it('should fall back to the window number when another window has no active tab', () => {
      const [, , , row] = toScopeItems([buildWindow(1, 1), buildWindow(2, 2, 5)]);

      expect(row?.title).toBe('Copy another window');
      expect(row?.subtitle).toBe('2 tabs · window 2');
    });

    it('should disable cmd on scope rows, since only a single tab can be focused', () => {
      const front = windows[0]?.tabs ?? [];
      const items = toScopeItems(windows, front.slice(0, 2));

      expect(items.every((item) => item.mods?.cmd?.valid === false)).toBe(true);
    });

    it('should lead with a row that copies the selected tabs when two or more are selected', () => {
      const front = buildWindow(1, 4);
      const [selected, ...rest] = toScopeItems(
        [front],
        front.tabs.filter((_, index) => index % 2 === 1),
      );

      expect(selected?.title).toBe('Copy selected tabs');
      expect(selected?.subtitle).toBe('2 tabs · selected in the window in front');
      expect(selected?.arg).toBe('- [Tab 1-2](https://example.dev/1/2)\n- [Tab 1-4](https://example.dev/1/4)');
      expect(rest.map(({ title }) => title)).toEqual(['Copy current tab', 'Copy this window']);
    });

    it('should lead with the selected tabs row when several windows are open too', () => {
      const front = windows[0]?.tabs ?? [];
      const items = toScopeItems(windows, front.slice(0, 3));

      expect(items.map(({ title }) => title)).toEqual([
        'Copy selected tabs',
        'Copy current tab',
        'Copy this window',
        'Copy all windows',
        'Copy another window',
        'Copy another window',
      ]);
    });

    it('should leave out the selected tabs row for a single selected tab, which Copy current tab covers', () => {
      const front = buildWindow(1, 4);
      const items = toScopeItems([front], front.tabs.slice(0, 1));

      expect(items.map(({ title }) => title)).toEqual(['Copy current tab', 'Copy this window']);
    });
  });

  describe('toSearchedTabs', () => {
    it("should number tabs from 1 to match Chrome's activeTabIndex", () => {
      const tabs = toSearchedTabs([buildWindow(7, 2)]);

      expect(tabs.map(({ windowId, tabIndex }) => ({ windowId, tabIndex }))).toEqual([
        { windowId: 7, tabIndex: 1 },
        { windowId: 7, tabIndex: 2 },
      ]);
    });
  });

  describe('toTabItems', () => {
    it('should carry window id and tab index in the cmd arg of a tab row', () => {
      const [item] = toTabItems([{ windowId: 12, tabIndex: 3, title: 'Alfredo', url: 'https://alfredo.dev' }]);

      expect(item?.arg).toBe('[Alfredo](https://alfredo.dev)');
      expect(item?.subtitle).toBe('https://alfredo.dev');
      expect(item?.mods?.cmd?.subtitle).toBe('Switch to this tab');
      expect(focusTabArgsSchema.parse(JSON.parse(String(item?.mods?.cmd?.arg)))).toEqual({ windowId: 12, tabIndex: 3 });
    });
  });

  describe('toIssueItem', () => {
    it('should render each issue as a row that cannot be actioned', () => {
      expect(toIssueItem({ kind: 'not-running' })).toMatchObject({ title: "Chrome isn't running", valid: false });
      expect(toIssueItem({ kind: 'not-authorized' })).toMatchObject({
        title: 'Allow Alfred to control Google Chrome',
        subtitle: 'System Settings › Privacy & Security › Automation',
        valid: false,
      });
      expect(toIssueItem({ kind: 'no-tabs' })).toMatchObject({ title: 'No open tabs', valid: false });
      expect(toIssueItem({ kind: 'failed', reason: 'boom' })).toMatchObject({
        title: "Couldn't read the Chrome tabs",
        subtitle: 'boom',
        text: { copy: 'boom', largetype: 'boom' },
        valid: false,
      });
    });
  });

  describe('loadTabsOutput', () => {
    it("should show only the issue row when Chrome isn't running", async () => {
      const { items } = await loadTabsOutput(
        { windows: [], selectedTabs: [], issues: [{ kind: 'not-running' }], debugLogs: [] },
        '',
        settings,
      );

      expect(items.map(({ title }) => title)).toEqual(["Chrome isn't running"]);
    });

    it('should show No open tabs when every window was incognito', async () => {
      const { items } = await loadTabsOutput(
        { windows: [], selectedTabs: [], issues: [{ kind: 'no-tabs' }], debugLogs: [] },
        'alfredo',
        settings,
      );

      expect(items.map(({ title }) => title)).toEqual(['No open tabs']);
    });

    it('should show the scope rows when no query is typed', async () => {
      const { items } = await loadTabsOutput(
        { windows: [buildWindow(1, 2)], selectedTabs: [], issues: [], debugLogs: [] },
        '',
        settings,
      );

      expect(items.map(({ title }) => title)).toEqual(['Copy current tab', 'Copy this window']);
    });

    it('should show the selected tabs row when no query is typed and tabs are selected', async () => {
      const front = buildWindow(1, 3);
      const { items } = await loadTabsOutput(
        { windows: [front], selectedTabs: front.tabs.slice(1), issues: [], debugLogs: [] },
        '',
        settings,
      );

      expect(items.map(({ title }) => title)).toEqual(['Copy selected tabs', 'Copy current tab', 'Copy this window']);
    });

    it('should search tabs by title when a query is typed', async () => {
      const windows: ChromeWindow[] = [
        {
          id: 1,
          activeTabIndex: 1,
          tabs: [
            { title: 'Alfredo workflows', url: 'https://github.com/avivbens/alfredo' },
            { title: 'Weather in Tel Aviv', url: 'https://weather.example.dev' },
            { title: 'Inbox', url: 'https://mail.example.dev' },
          ],
        },
      ];

      const { items } = await loadTabsOutput(
        { windows, selectedTabs: [], issues: [], debugLogs: [] },
        'alfredo',
        settings,
      );

      expect(items.map(({ title }) => title)).toEqual(['Alfredo workflows']);
    });

    it('should cap the matches at the slice amount', async () => {
      const { items } = await loadTabsOutput(
        { windows: [buildWindow(1, 5)], selectedTabs: [], issues: [], debugLogs: [] },
        'tab',
        {
          ...settings,
          sliceAmount: 2,
        },
      );

      expect(items).toHaveLength(2);
    });
  });
});
