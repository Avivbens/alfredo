import { z } from 'zod';
import { runAppleScript } from '@alfredo/run-applescript';
import { chromeTabsResultSchema } from '../models/chrome-tabs.schema';
import type { ChromeTabsLoad } from '../models/chrome-tabs.schema';

const NOT_AUTHORIZED_CODE = '-1743';

/**
 * `running()` goes first because any other call launches a closed Chrome.
 * The bulk getters cost one Apple event per window instead of one per tab.
 */
const READ_TABS_SCRIPT = `
function run() {
  const chrome = Application('Google Chrome');
  if (!chrome.running()) {
    return JSON.stringify({ running: false });
  }
  const windows = chrome
    .windows()
    .filter((w) => w.mode() !== 'incognito')
    .map((w) => {
      const titles = w.tabs.title();
      const urls = w.tabs.url();
      return {
        id: w.id(),
        activeTabIndex: w.activeTabIndex(),
        tabs: titles.map((title, i) => ({ title, url: urls[i] })),
      };
    });
  return JSON.stringify({ running: true, windows });
}
`;

/** Chrome declares the window `id` as text, so a number would not match. */
const FOCUS_TAB_SCRIPT = `
function run(argv) {
  const { windowId, tabIndex } = JSON.parse(argv[0]);
  const chrome = Application('Google Chrome');
  if (!chrome.running()) {
    return;
  }
  const window = chrome.windows.byId(String(windowId));
  window.activeTabIndex = tabIndex;
  window.minimized = false;
  window.index = 1;
  chrome.activate();
}
`;

/**
 * `execFile` puts the whole script in `message` and the real cause in `stderr`.
 * Zod messages are JSON, so they are prettified.
 */
function toReason(error: unknown): string {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }

  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';

  return stderr || (error instanceof Error ? error.message : String(error));
}

export async function loadChromeTabs(): Promise<ChromeTabsLoad> {
  try {
    const output = await runAppleScript(READ_TABS_SCRIPT, { language: 'JavaScript' });
    const result = chromeTabsResultSchema.parse(JSON.parse(output));

    if (!result.running) {
      return { windows: [], issues: [{ kind: 'not-running' }] };
    }

    const windows = result.windows.filter(({ tabs }) => tabs.length > 0);

    return { windows, issues: windows.length ? [] : [{ kind: 'no-tabs' }] };
  } catch (error) {
    const reason = toReason(error);
    if (reason.includes(NOT_AUTHORIZED_CODE)) {
      return { windows: [], issues: [{ kind: 'not-authorized' }] };
    }

    return { windows: [], issues: [{ kind: 'failed', reason }] };
  }
}

export async function focusChromeTab(windowId: number, tabIndex: number): Promise<void> {
  await runAppleScript(FOCUS_TAB_SCRIPT, {
    language: 'JavaScript',
    args: [JSON.stringify({ windowId, tabIndex })],
  });
}
