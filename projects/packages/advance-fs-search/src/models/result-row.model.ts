import type { Worktree } from '@alfredo/git-worktrees';
import type { FileSearch } from './file-search.model';

export type ResultRow =
  | { kind: 'entry'; file: FileSearch }
  | { kind: 'checkout'; checkout: Worktree; dirty: boolean }
  | { kind: 'repo'; main: Worktree; worktreeCount: number; dirty: boolean };
