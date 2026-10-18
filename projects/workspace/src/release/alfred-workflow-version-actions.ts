import { execSync } from 'node:child_process';
import type { AfterAllProjectsVersioned } from 'nx/release';
import { type Tree, joinPathFragments, logger } from '@nx/devkit';
import JsVersionActions, {
  afterAllProjectsVersioned as afterAllJsProjectsVersioned,
} from '@nx/js/src/release/version-actions';

const bumpedWorkflows = new Map<string, { root: string; version: string }>();

export default class AlfredWorkflowVersionActions extends JsVersionActions {
  override async updateProjectVersion(tree: Tree, newVersion: string): Promise<string[]> {
    bumpedWorkflows.set(this.projectGraphNode.name, { root: this.projectGraphNode.data.root, version: newVersion });
    return super.updateProjectVersion(tree, newVersion);
  }
}

/**
 * `nx release` commits only the files it changed itself, so the `info.plist` fast-alfred bumps
 * has to be reported here to land in the release commit.
 */
export const afterAllProjectsVersioned: AfterAllProjectsVersioned = async (cwd, opts) => {
  const { changedFiles, deletedFiles } = await afterAllJsProjectsVersioned(cwd, opts);
  const workflows = [...bumpedWorkflows];
  bumpedWorkflows.clear();

  if (opts.dryRun) {
    return { changedFiles, deletedFiles };
  }

  for (const [project, { version }] of workflows) {
    execSync(`pnpm exec nx run ${project}:build:ci --skip-nx-cache -- --version ${version}`, { cwd, stdio: 'inherit' });
  }

  const changedFilesWithInfoPlist = [
    ...changedFiles,
    ...workflows.map(([, { root }]) => joinPathFragments(root, 'info.plist')),
  ];

  logger.log(`updated info.plist files:`, changedFilesWithInfoPlist);
  return {
    changedFiles: changedFilesWithInfoPlist,
    deletedFiles,
  };
};
