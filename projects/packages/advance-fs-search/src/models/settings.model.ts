import type { SearchOptions } from './search-options.model';
import type { WorktreeRepos } from './worktree-repos.model';

export interface Settings {
  sliceAmount: number;
  worktreeRepos: WorktreeRepos;
  search: Required<Omit<SearchOptions, 'name'>>;
}
