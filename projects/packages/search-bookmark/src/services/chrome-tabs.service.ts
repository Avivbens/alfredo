import { z } from 'zod';
import { runAppleScript } from '@alfredo/run-applescript';
import { chromeTabsResultSchema, tabStripSchema } from '../models/chrome-tabs.schema';
import type { ChromeTabsLoad, ChromeWindow, FocusTabArgs, TabStrip, TabStripRead } from '../models/chrome-tabs.schema';

const NOT_AUTHORIZED_CODE = '-1743';

/** The slice of Chrome's scripting dictionary the handlers use. JXA reads a property by calling it and sets it by assigning it. */
interface JxaChromeWindow {
  id(): string;
  mode(): 'normal' | 'incognito';
  activeTabIndex(): number;
  tabs: { title(): string[]; url(): string[] };
}

interface JxaChromeWindowSetters {
  activeTabIndex: number;
  minimized: boolean;
  index: number;
}

interface JxaChrome {
  running(): boolean;
  activate(): void;
  windows: {
    (): JxaChromeWindow[];
    /** Chrome declares the window `id` as text, so a number would not match. */
    byId(id: string): JxaChromeWindowSetters;
  };
}

interface JxaUiElement {
  exists(): boolean;
  groups: { at(index: number): JxaUiElement };
  tabGroups: { at(index: number): JxaUiElement };
  uiElements: { (): JxaUiElement[]; role(): string[] };
  radioButtons: { title(): string[]; value(): unknown[] };
}

interface JxaSystemEvents {
  processes: {
    byName(name: 'Google Chrome'): { attributes: { byName(name: 'AXMainWindow'): { value(): JxaUiElement | null } } };
  };
}

declare function Application(name: 'Google Chrome'): JxaChrome;
declare function Application(name: 'System Events'): JxaSystemEvents;

/**
 * `running()` goes first because any other call launches a closed Chrome.
 * The bulk getters cost one Apple event per window instead of one per tab.
 */
function readTabs(): string {
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

/**
 * The known path costs one Apple event, while the walk costs one per element, so the walk only covers a changed Chrome layout.
 * It never enters web content, which can hold thousands of elements.
 * Accessibility only sees windows on the current desktop that are neither hidden nor minimized.
 */
function readTabStrip(): string {
  const mainWindow = Application('System Events')
    .processes.byName('Google Chrome')
    .attributes.byName('AXMainWindow')
    .value();
  if (!mainWindow) {
    throw new Error('Chrome has no visible window on this desktop');
  }

  const containerRoles = ['AXGroup', 'AXSplitGroup', 'AXUnknown'];
  const known = mainWindow.groups.at(0).groups.at(1).groups.at(0).groups.at(0).groups.at(1).tabGroups.at(0);

  let strip = known.exists() ? known : undefined;
  let level = strip ? [] : [mainWindow];
  for (let depth = 0; !strip && level.length && depth < 10; depth++) {
    const next: JxaUiElement[] = [];
    for (const element of level) {
      const children = element.uiElements();
      const roles = element.uiElements.role();
      strip = children.find((_, index) => roles[index] === 'AXTabGroup');
      if (strip) {
        break;
      }
      next.push(...children.filter((_, index) => containerRoles.includes(roles[index] ?? '')));
    }
    level = next;
  }

  if (!strip) {
    throw new Error("Couldn't find Chrome's tab strip");
  }

  return JSON.stringify({ titles: strip.radioButtons.title(), selected: strip.radioButtons.value().map(Boolean) });
}

function focusTab([args]: [string]): void {
  const { windowId, tabIndex }: FocusTabArgs = JSON.parse(args);
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

/**
 * osascript runs the handler from its source, so a handler must not reach outside its own body - no imports or module constants.
 * The `run` wrapper keeps working whatever name the bundler gives the function.
 */
function toJxaScript(handler: (...argv: never) => unknown): string {
  return `function run(argv) { return (${handler.toString()})(argv); }`;
}

/**
 * `execFile`'s message only names the command, so the cause comes from `stderr`, or from `signal` when the process was killed without writing any.
 * Zod messages are JSON, so they are prettified.
 */
function toReason(error: unknown): string {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }

  const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr).trim() : '';
  if (stderr) {
    return stderr;
  }

  const message = error instanceof Error ? error.message : String(error);
  const signal = error instanceof Error && 'signal' in error && error.signal ? ` (${String(error.signal)})` : '';

  return `${message}${signal}`;
}

type Selection = Pick<ChromeTabsLoad, 'selectedTabs' | 'debugLogs'>;

/**
 * Accessibility titles carry state such as " - Pinned", so tabs match by position and title prefix.
 * A collapsed tab group or another window in front breaks the match, and then nothing counts as selected.
 */
function toMatchedSelection(front: ChromeWindow, { titles, selected }: TabStrip): Selection {
  const isSameWindow =
    titles.length === front.tabs.length && front.tabs.every(({ title }, index) => titles[index]?.startsWith(title));
  if (!isSameWindow) {
    const mismatch = `Couldn't match Chrome's tab strip (${titles.length} tabs) to the front window (${front.tabs.length} tabs)`;
    return { selectedTabs: [], debugLogs: [mismatch] };
  }

  return { selectedTabs: front.tabs.filter((_, index) => selected[index]), debugLogs: [] };
}

export function toSelection(front: ChromeWindow | undefined, read: TabStripRead): Selection {
  if (!front) {
    return { selectedTabs: [], debugLogs: [] };
  }

  switch (read.kind) {
    case 'skipped':
      return { selectedTabs: [], debugLogs: [] };
    case 'failed':
      return { selectedTabs: [], debugLogs: [`Couldn't read the selected tabs: ${read.reason}`] };
    case 'read':
      return toMatchedSelection(front, read.strip);
  }
}

async function loadTabStrip(withSelection: boolean): Promise<TabStripRead> {
  if (!withSelection) {
    return { kind: 'skipped' };
  }

  try {
    const output = await runAppleScript(toJxaScript(readTabStrip), { language: 'JavaScript' });
    const strip = tabStripSchema.parse(JSON.parse(output));

    return { kind: 'read', strip };
  } catch (error) {
    return { kind: 'failed', reason: toReason(error) };
  }
}

export async function loadChromeTabs({ withSelection = false } = {}): Promise<ChromeTabsLoad> {
  try {
    const [output, stripRead] = await Promise.all([
      runAppleScript(toJxaScript(readTabs), { language: 'JavaScript' }),
      loadTabStrip(withSelection),
    ]);
    const result = chromeTabsResultSchema.parse(JSON.parse(output));

    if (!result.running) {
      return { windows: [], selectedTabs: [], issues: [{ kind: 'not-running' }], debugLogs: [] };
    }

    const windows = result.windows.filter(({ tabs }) => tabs.length > 0);
    const { selectedTabs, debugLogs } = toSelection(windows[0], stripRead);

    return { windows, selectedTabs, issues: windows.length ? [] : [{ kind: 'no-tabs' }], debugLogs };
  } catch (error) {
    const reason = toReason(error);
    if (reason.includes(NOT_AUTHORIZED_CODE)) {
      return { windows: [], selectedTabs: [], issues: [{ kind: 'not-authorized' }], debugLogs: [] };
    }

    return { windows: [], selectedTabs: [], issues: [{ kind: 'failed', reason }], debugLogs: [] };
  }
}

export async function focusChromeTab(windowId: number, tabIndex: number): Promise<void> {
  await runAppleScript(toJxaScript(focusTab), {
    language: 'JavaScript',
    args: [JSON.stringify({ windowId, tabIndex })],
  });
}
