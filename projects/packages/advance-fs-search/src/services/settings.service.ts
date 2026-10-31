import type { EnvService } from 'fast-alfred';
import { parseFlag, parsePaths } from '../common/env.util';
import { Variables } from '../common/variables';
import type { SearchOptions } from '../models/search-options.model';
import type { Settings } from '../models/settings.model';
import { type WorktreeRepos, parseWorktreeRepos } from '../models/worktree-repos.model';

export function getSettings(env: EnvService): Settings {
  return {
    sliceAmount: env.getEnv<number>(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number }),
    worktreeRepos: env.getEnv<WorktreeRepos>(Variables.WORKTREE_REPOS, {
      defaultValue: {},
      parser: parseWorktreeRepos,
    }),
    search: getSearchSettings(env),
  };
}

function getSearchSettings(env: EnvService): Settings['search'] {
  return {
    type: env.getEnv<SearchOptions['type']>(Variables.TARGET_TYPE, { defaultValue: 'all' }),
    onlyIn: getPaths(env, Variables.ONLY_IN),
    forceInclude: getPaths(env, Variables.FORCE_INCLUDE),
    excludePaths: getPaths(env, Variables.EXCLUDE_PATHS),
    excludeGit: getFlag(env, Variables.EXCLUDE_GIT),
    excludeHidden: getFlag(env, Variables.EXCLUDE_HIDDEN),
    gitReposOnly: getFlag(env, Variables.GIT_REPOS_ONLY),
    excludeNodeModules: getFlag(env, Variables.EXCLUDE_NODE_MODULES),
    searchWorktrees: getFlag(env, Variables.SEARCH_WORKTREES),
  };
}

function getFlag(env: EnvService, variable: Variables): boolean {
  return env.getEnv<boolean>(variable, { defaultValue: false, parser: parseFlag });
}

function getPaths(env: EnvService, variable: Variables): string[] {
  return env.getEnv<string[]>(variable, { defaultValue: [], parser: parsePaths });
}
