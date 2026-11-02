import type { LocalStack, Worktree } from '@alfredo/git-worktrees';

export type CheckoutLayer = Pick<LocalStack['branches'][number], 'prNumber'> & { position: number; size: number };

export type CheckoutEntry =
  | { kind: 'checkout'; checkout: Worktree; layer?: CheckoutLayer; glyph?: string }
  | { kind: 'stack-header'; title: string; subtitle: string };

export type StackHeaderEntry = Extract<CheckoutEntry, { kind: 'stack-header' }>;
