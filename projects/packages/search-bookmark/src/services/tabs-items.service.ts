import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred';
import type { z } from 'zod';
import type {
  ChromeTabsIssue,
  ChromeTabsLoad,
  ChromeWindow,
  FocusTabArgs,
  SearchedTab,
} from '../models/chrome-tabs.schema';
import type { SettingsSchema } from '../models/settings.schema';
import { TABS_SEARCH_FIELDS_CONFIG } from './search.config';
import { fuzzySearch } from './search.service';
import { toAllWindowsMarkdown, toMarkdownLink, toWindowMarkdown } from './tabs-markdown.service';

type TabsSettings = Pick<z.output<typeof SettingsSchema>, 'sliceAmount' | 'fuzzyThreshold'>;

/** Only a single tab can be focused, so scope rows refuse the cmd modifier. */
const SCOPE_CMD_MOD = { valid: false, arg: '', subtitle: 'Search for a tab to switch to it' };

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function toSearchedTabs(windows: ChromeWindow[]): SearchedTab[] {
  return windows.flatMap(({ id, tabs }) => tabs.map((tab, index) => ({ ...tab, windowId: id, tabIndex: index + 1 })));
}

export function toScopeItems(windows: ChromeWindow[]): AlfredListItem[] {
  const [front] = windows;
  if (!front) {
    return [];
  }

  const frontItem: AlfredListItem = {
    title: 'Copy this window',
    subtitle: `${pluralize(front.tabs.length, 'tab')} · the window in front`,
    arg: toWindowMarkdown(front),
    mods: { cmd: SCOPE_CMD_MOD },
  };

  const activeTab = front.tabs[front.activeTabIndex - 1];
  const currentItems: AlfredListItem[] = activeTab
    ? [
        {
          title: 'Copy current tab',
          subtitle: activeTab.title || activeTab.url,
          arg: toMarkdownLink(activeTab),
          mods: { cmd: SCOPE_CMD_MOD },
        },
      ]
    : [];

  if (windows.length < 2) {
    return [...currentItems, frontItem];
  }

  /** Windows come front to back, so Window 1 is the front row and only Window 2 to N get their own row. */
  const otherWindowItems: AlfredListItem[] = windows.slice(1).map((window, index) => {
    const activeWindowTab = window.tabs[window.activeTabIndex - 1];
    const count = pluralize(window.tabs.length, 'tab');
    const label = activeWindowTab ? `showing "${activeWindowTab.title || activeWindowTab.url}"` : `window ${index + 2}`;

    return {
      title: 'Copy another window',
      subtitle: `${count} · ${label}`,
      arg: toWindowMarkdown(window),
      mods: { cmd: SCOPE_CMD_MOD },
    };
  });

  return [
    ...currentItems,
    frontItem,
    {
      title: 'Copy all windows',
      subtitle: `${pluralize(windows.flatMap(({ tabs }) => tabs).length, 'tab')} in ${pluralize(windows.length, 'window')}`,
      arg: toAllWindowsMarkdown(windows),
      mods: { cmd: SCOPE_CMD_MOD },
    },
    ...otherWindowItems,
  ];
}

export function toTabItems(tabs: SearchedTab[]): AlfredListItem[] {
  return tabs.map(({ windowId, tabIndex, title, url }) => ({
    title: title || url,
    subtitle: url,
    arg: toMarkdownLink({ title, url }),
    mods: {
      cmd: { subtitle: 'Switch to this tab', arg: JSON.stringify({ windowId, tabIndex } satisfies FocusTabArgs) },
    },
  }));
}

export function toIssueItem(issue: ChromeTabsIssue): AlfredListItem {
  switch (issue.kind) {
    case 'not-running':
      return { title: "Chrome isn't running", valid: false };
    case 'not-authorized':
      return {
        title: 'Allow Alfred to control Google Chrome',
        subtitle: 'System Settings › Privacy & Security › Automation',
        valid: false,
      };
    case 'no-tabs':
      return { title: 'No open tabs', valid: false };
    case 'failed':
      return {
        title: "Couldn't read the Chrome tabs",
        subtitle: issue.reason,
        text: { copy: issue.reason, largetype: issue.reason },
        valid: false,
      };
  }
}

export async function loadTabsOutput(
  { windows, issues }: ChromeTabsLoad,
  query: string,
  { sliceAmount, fuzzyThreshold }: TabsSettings,
): Promise<AlfredScriptFilter> {
  const issueItems = issues.map(toIssueItem);

  if (!query.trim()) {
    return { items: [...issueItems, ...toScopeItems(windows)] };
  }

  const matches = await fuzzySearch(
    toSearchedTabs(windows),
    TABS_SEARCH_FIELDS_CONFIG,
    query,
    sliceAmount,
    fuzzyThreshold,
  );

  return { items: [...issueItems, ...toTabItems(matches)] };
}
