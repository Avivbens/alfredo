import type { FileSearch } from './file-search.model';
import type { Worktree } from './worktree.model';

export type ResultRow = { kind: 'entry'; file: FileSearch } | { kind: 'repo'; main: Worktree; worktreeCount: number };
