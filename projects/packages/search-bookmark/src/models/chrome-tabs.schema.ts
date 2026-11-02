import { z } from 'zod';

export const chromeTabSchema = z.object({ title: z.string(), url: z.string() });
export type ChromeTab = z.infer<typeof chromeTabSchema>;

/** JXA can return numeric ids as strings. */
export const chromeWindowSchema = z.object({
  id: z.coerce.number(),
  activeTabIndex: z.coerce.number(),
  tabs: z.array(chromeTabSchema),
});
export type ChromeWindow = z.infer<typeof chromeWindowSchema>;

export const chromeTabsResultSchema = z.discriminatedUnion('running', [
  z.object({ running: z.literal(false) }),
  z.object({ running: z.literal(true), windows: z.array(chromeWindowSchema) }),
]);

export const chromeTabsIssueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('not-running') }),
  z.object({ kind: z.literal('not-authorized') }),
  z.object({ kind: z.literal('no-tabs') }),
  z.object({ kind: z.literal('failed'), reason: z.string() }),
]);
export type ChromeTabsIssue = z.infer<typeof chromeTabsIssueSchema>;

/** `tabIndex` is 1-based, like Chrome's `activeTabIndex`. */
export const focusTabArgsSchema = z.object({ windowId: z.number(), tabIndex: z.number() });
export type FocusTabArgs = z.infer<typeof focusTabArgsSchema>;

export type SearchedTab = ChromeTab & FocusTabArgs;

export interface ChromeTabsLoad {
  windows: ChromeWindow[];
  issues: ChromeTabsIssue[];
}
