import { execSync } from 'node:child_process';
import type { ProjectGraphProjectNode } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import AlfredWorkflowVersionActions, { afterAllProjectsVersioned } from './alfred-workflow-version-actions';

jest.mock('node:child_process', () => ({ ...jest.requireActual('node:child_process'), execSync: jest.fn() }));
jest.mock('@nx/js/src/release/version-actions', () => ({
  ...jest.requireActual('@nx/js/src/release/version-actions'),
  afterAllProjectsVersioned: jest.fn(async () => ({ changedFiles: ['pnpm-lock.yaml'], deletedFiles: [] })),
}));

const WORKSPACE_ROOT = '/workspace';
const WORKFLOW: ProjectGraphProjectNode = {
  name: 'my-workflow',
  type: 'app',
  data: { root: 'projects/packages/my-workflow' },
};

const bumpWorkflow = async (version: string): Promise<void> => {
  const versionActions = new AlfredWorkflowVersionActions({} as never, WORKFLOW, {} as never);
  await versionActions.updateProjectVersion(createTreeWithEmptyWorkspace(), version);
};

describe('alfred workflow version actions', () => {
  it('should bump each released workflow with fast-alfred and report its info.plist to nx release', async () => {
    await bumpWorkflow('1.3.0');

    const result = await afterAllProjectsVersioned(WORKSPACE_ROOT, { dryRun: false });

    expect(jest.mocked(execSync)).toHaveBeenCalledWith(
      'pnpm exec nx run my-workflow:build:ci --skip-nx-cache -- --version 1.3.0',
      { cwd: WORKSPACE_ROOT, stdio: 'inherit' },
    );
    expect(result).toEqual({
      changedFiles: ['pnpm-lock.yaml', 'projects/packages/my-workflow/info.plist'],
      deletedFiles: [],
    });
  });

  it('should not build anything on a dry run', async () => {
    await bumpWorkflow('1.3.0');

    const result = await afterAllProjectsVersioned(WORKSPACE_ROOT, { dryRun: true });

    expect(jest.mocked(execSync)).not.toHaveBeenCalled();
    expect(result).toEqual({ changedFiles: ['pnpm-lock.yaml'], deletedFiles: [] });
  });
});
