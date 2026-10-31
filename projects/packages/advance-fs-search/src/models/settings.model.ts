import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';

export const SettingsSchema = z
  .object({
    slice_amount: alfredSchemas.number().default(10),
    target_type: z.enum(['file', 'folder', 'all']).default('all'),
    only_in: alfredSchemas.paths().default([]),
    force_include: alfredSchemas.paths().default([]),
    exclude_paths: alfredSchemas.paths().default([]),
    exclude_git: alfredSchemas.checkbox().default(false),
    exclude_hidden: alfredSchemas.checkbox().default(false),
    git_repos_only: alfredSchemas.checkbox().default(false),
    exclude_node_modules: alfredSchemas.checkbox().default(false),
    search_worktrees: alfredSchemas.checkbox().default(false),
  })
  .transform((env) => ({
    sliceAmount: env.slice_amount,
    search: {
      type: env.target_type,
      onlyIn: env.only_in,
      forceInclude: env.force_include,
      excludePaths: env.exclude_paths,
      excludeGit: env.exclude_git,
      excludeHidden: env.exclude_hidden,
      gitReposOnly: env.git_repos_only,
      excludeNodeModules: env.exclude_node_modules,
      /**
       * @description
       * Whether to treat linked git worktrees (a `.git` file) as git repositories
       */
      searchWorktrees: env.search_worktrees,
    },
  }));

export type Settings = z.infer<typeof SettingsSchema>;
