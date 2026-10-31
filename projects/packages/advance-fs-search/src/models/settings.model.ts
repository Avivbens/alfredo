import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { Variables } from '../common/variables';
import { WorktreeReposSchema } from './worktree-repos.model';

export const SettingsSchema = z
  .object({
    [Variables.SLICE_AMOUNT]: alfredSchemas.number().default(10),
    [Variables.TARGET_TYPE]: z.enum(['file', 'folder', 'all']).default('all'),
    [Variables.ONLY_IN]: alfredSchemas.paths().default([]),
    [Variables.FORCE_INCLUDE]: alfredSchemas.paths().default([]),
    [Variables.EXCLUDE_PATHS]: alfredSchemas.paths().default([]),
    [Variables.EXCLUDE_GIT]: alfredSchemas.checkbox().default(false),
    [Variables.EXCLUDE_HIDDEN]: alfredSchemas.checkbox().default(false),
    [Variables.GIT_REPOS_ONLY]: alfredSchemas.checkbox().default(false),
    [Variables.EXCLUDE_NODE_MODULES]: alfredSchemas.checkbox().default(false),
    [Variables.SEARCH_WORKTREES]: alfredSchemas.checkbox().default(false),
    [Variables.WORKTREE_REPOS]: alfredSchemas.json(WorktreeReposSchema).default({}),
  })
  .transform((env) => ({
    sliceAmount: env[Variables.SLICE_AMOUNT],
    worktreeRepos: env[Variables.WORKTREE_REPOS],
    search: {
      type: env[Variables.TARGET_TYPE],
      onlyIn: env[Variables.ONLY_IN],
      forceInclude: env[Variables.FORCE_INCLUDE],
      excludePaths: env[Variables.EXCLUDE_PATHS],
      excludeGit: env[Variables.EXCLUDE_GIT],
      excludeHidden: env[Variables.EXCLUDE_HIDDEN],
      gitReposOnly: env[Variables.GIT_REPOS_ONLY],
      excludeNodeModules: env[Variables.EXCLUDE_NODE_MODULES],
      /**
       * @description
       * Whether to treat linked git worktrees (a `.git` file) as git repositories
       */
      searchWorktrees: env[Variables.SEARCH_WORKTREES],
    },
  }));

export type Settings = z.infer<typeof SettingsSchema>;
