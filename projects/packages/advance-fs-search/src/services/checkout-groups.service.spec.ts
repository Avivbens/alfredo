import { describe, expect, it } from 'vitest';
import type { LocalStack, Worktree } from '@alfredo/git-worktrees';
import { toCheckoutEntries } from './checkout-groups.service';

const REPO = '/Users/me/dev/alfredo';

/** Trimmed from the alfredo repo's `git worktree list` and `.git/gh-stack`, in the order `getCheckouts` and `readLocalStacks` return them. */
const MAIN: Worktree = { path: REPO, branch: 'migration/bump-fast-alfred' };
const CALENDAR: Worktree = { path: `${REPO}@calendar-eventkit`, branch: 'feat/calendar-eventkit-reminders' };
const CHROME_TABS: Worktree = { path: `${REPO}@chrome-tabs-markdown`, branch: 'feat/chrome-tabs-markdown' };
const GIF_PREVIEW: Worktree = { path: `${REPO}@search-gif`, branch: 'feat/search-gif-preview' };
const GIF_COPY: Worktree = { path: `${REPO}@search-gif-copy`, branch: 'feat/search-gif-copy' };
const GIF_SEARCH: Worktree = { path: `${REPO}@search-gif-search`, branch: 'feat/search-gif-search' };
const NEW_TASK: Worktree = { path: `${REPO}@try-new-task`, branch: 'feat/try-new-task' };
const WORKTREE_FLOW: Worktree = { path: `${REPO}@worktree-flow`, branch: 'feat/advance-fs-search-stacks' };

const CHECKOUTS = [MAIN, CALENDAR, CHROME_TABS, GIF_PREVIEW, GIF_COPY, GIF_SEARCH, NEW_TASK, WORKTREE_FLOW];

/** Not in the real repo: a calendar layer whose folder sorts after a higher layer's, to tell layer order from folder order. */
const CALENDAR_LIST: Worktree = { path: `${REPO}@calendar-list`, branch: 'feat/calendar-agenda' };

const STACK_50: LocalStack = {
  number: 50,
  branches: [
    { branch: 'migration/adopt-fast-alfred-2-8', prNumber: 48 },
    { branch: 'migration/workflow-settings-schemas', prNumber: 49 },
  ],
};
const WORKTREE_FLOW_STACK: LocalStack = {
  branches: [
    { branch: 'feat/worktree-libs-scaffold' },
    { branch: 'feat/worktree-libs-git' },
    { branch: 'feat/advance-fs-search-sessions' },
    { branch: 'feat/worktree-launcher-scaffold' },
    { branch: 'feat/worktree-launcher-prs' },
    { branch: 'feat/worktree-launcher-new-task' },
    { branch: 'feat/worktree-launcher-stacks' },
    { branch: 'feat/advance-fs-search-stacks' },
  ],
};
const CALENDAR_STACK: LocalStack = {
  branches: [
    { branch: 'feat/calendar-agenda' },
    { branch: 'feat/calendar-eventkit-events' },
    { branch: 'feat/calendar-eventkit-reminders' },
  ],
};
const STACK_68: LocalStack = {
  number: 68,
  branches: [
    { branch: 'fix/generate-workflow-builds', prNumber: 67 },
    { branch: 'feat/search-gif-scaffold', prNumber: 58 },
    { branch: 'feat/search-gif-search', prNumber: 59 },
    { branch: 'feat/search-gif-copy', prNumber: 60 },
    { branch: 'feat/search-gif-preview', prNumber: 62 },
  ],
};

const STACKS = [STACK_50, WORKTREE_FLOW_STACK, CALENDAR_STACK, STACK_68];

const STACK_68_ENTRIES = [
  { kind: 'stack-header', title: 'Stack 68 · 3 worktrees', subtitle: '3 of 5 layers checked out' },
  { kind: 'checkout', checkout: GIF_SEARCH, layer: { position: 3, size: 5, prNumber: 59 }, glyph: '│ ' },
  { kind: 'checkout', checkout: GIF_COPY, layer: { position: 4, size: 5, prNumber: 60 }, glyph: '│ ' },
  { kind: 'checkout', checkout: GIF_PREVIEW, layer: { position: 5, size: 5, prNumber: 62 }, glyph: '└ ' },
];

describe('checkout-groups.service', () => {
  describe('toCheckoutEntries', () => {
    it("should show each stack's worktrees in layer order under one header, where its first worktree was", () => {
      expect(toCheckoutEntries(CHECKOUTS, STACKS)).toEqual([
        { kind: 'checkout', checkout: MAIN },
        { kind: 'stack-header', title: 'Stack · calendar-eventkit', subtitle: '1 of 3 layers checked out' },
        { kind: 'checkout', checkout: CALENDAR, layer: { position: 3, size: 3 }, glyph: '└ ' },
        { kind: 'checkout', checkout: CHROME_TABS },
        ...STACK_68_ENTRIES,
        { kind: 'checkout', checkout: NEW_TASK },
        { kind: 'stack-header', title: 'Stack · worktree-flow', subtitle: '1 of 8 layers checked out' },
        { kind: 'checkout', checkout: WORKTREE_FLOW, layer: { position: 8, size: 8 }, glyph: '└ ' },
      ]);
    });

    it('should keep the main checkout first and ungrouped, even on a stack branch, so the repo itself always leads', () => {
      const main = { path: REPO, branch: 'feat/search-gif-scaffold' };

      const entries = toCheckoutEntries([main, GIF_PREVIEW, GIF_COPY, GIF_SEARCH], [STACK_68]);

      expect(entries).toEqual([{ kind: 'checkout', checkout: main }, ...STACK_68_ENTRIES]);
    });

    it('should title an unnumbered stack after its first folder by layer, past the last @', () => {
      const entries = toCheckoutEntries([MAIN, CALENDAR, CALENDAR_LIST], [CALENDAR_STACK]);

      expect(entries).toEqual([
        { kind: 'checkout', checkout: MAIN },
        { kind: 'stack-header', title: 'Stack · calendar-list', subtitle: '2 of 3 layers checked out' },
        { kind: 'checkout', checkout: CALENDAR_LIST, layer: { position: 1, size: 3 }, glyph: '│ ' },
        { kind: 'checkout', checkout: CALENDAR, layer: { position: 3, size: 3 }, glyph: '└ ' },
      ]);
    });

    it('should pull a later member up to its stack, ahead of a checkout that sat between them', () => {
      const entries = toCheckoutEntries([MAIN, CALENDAR, CHROME_TABS, CALENDAR_LIST], [CALENDAR_STACK]);

      expect(entries).toEqual([
        { kind: 'checkout', checkout: MAIN },
        { kind: 'stack-header', title: 'Stack · calendar-list', subtitle: '2 of 3 layers checked out' },
        { kind: 'checkout', checkout: CALENDAR_LIST, layer: { position: 1, size: 3 }, glyph: '│ ' },
        { kind: 'checkout', checkout: CALENDAR, layer: { position: 3, size: 3 }, glyph: '└ ' },
        { kind: 'checkout', checkout: CHROME_TABS },
      ]);
    });

    it('should give a stack with a single worktree its header too', () => {
      const [, header] = toCheckoutEntries([MAIN, GIF_COPY], [STACK_68]);

      expect(header).toEqual({
        kind: 'stack-header',
        title: 'Stack 68 · 1 worktree',
        subtitle: '1 of 5 layers checked out',
      });
    });

    it.each([
      ['no local stacks', []],
      ['stacks none of the checkouts are on', [STACK_50]],
    ])('should list the checkouts as they are with %s', (_, stacks) => {
      const entries = toCheckoutEntries(CHECKOUTS, stacks);

      expect(entries).toEqual(CHECKOUTS.map((checkout) => ({ kind: 'checkout', checkout })));
    });

    it('should keep only stack 68 and its header for "stack 68"', () => {
      expect(toCheckoutEntries(CHECKOUTS, STACKS, 'stack 68')).toEqual(STACK_68_ENTRIES);
    });

    it('should keep a header while any of its worktrees match, counting the whole stack', () => {
      expect(toCheckoutEntries(CHECKOUTS, STACKS, 'COPY')).toEqual([
        { kind: 'stack-header', title: 'Stack 68 · 3 worktrees', subtitle: '3 of 5 layers checked out' },
        { kind: 'checkout', checkout: GIF_COPY, layer: { position: 4, size: 5, prNumber: 60 }, glyph: '└ ' },
      ]);
    });

    it('should close the tree on the last worktree typing leaves, even below a hidden one', () => {
      const entries = toCheckoutEntries([MAIN, CALENDAR, CALENDAR_LIST], [CALENDAR_STACK], 'agenda');

      expect(entries).toEqual([
        { kind: 'stack-header', title: 'Stack · calendar-list', subtitle: '2 of 3 layers checked out' },
        { kind: 'checkout', checkout: CALENDAR_LIST, layer: { position: 1, size: 3 }, glyph: '└ ' },
      ]);
    });

    it.each(['┌', '│', '└'])('should never match the tree glyph %s, since it only draws the group', (glyph) => {
      expect(toCheckoutEntries(CHECKOUTS, STACKS, glyph)).toEqual([]);
    });

    it('should match every worktree of an unnumbered stack by the name in its header', () => {
      const entries = toCheckoutEntries([MAIN, CALENDAR, CALENDAR_LIST], [CALENDAR_STACK], 'stack calendar-list');

      expect(entries.map(({ kind }) => kind)).toEqual(['stack-header', 'checkout', 'checkout']);
    });

    it('should match checkouts outside stacks on their folder and branch, as before', () => {
      expect(toCheckoutEntries(CHECKOUTS, STACKS, 'chrome-tabs')).toEqual([
        { kind: 'checkout', checkout: CHROME_TABS },
      ]);
    });

    it('should list nothing for a repo with no checkouts', () => {
      expect(toCheckoutEntries([], STACKS)).toEqual([]);
    });
  });
});
