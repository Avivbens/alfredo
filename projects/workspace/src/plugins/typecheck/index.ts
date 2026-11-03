import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  CreateNodes,
  CreateNodesContext,
  CreateNodesResult,
  TargetConfiguration,
  createNodesFromFiles,
} from '@nx/devkit';

/**
 * Determines the correct tsconfig file to use based on project type.
 * - Applications (in projects/apps/) should use tsconfig.app.json
 * - Libraries (in projects/libs/) should use tsconfig.lib.json
 */
const findTsconfig = (configFilePath: string) => {
  const filename = basename(configFilePath);
  return filename;
};

const SPEC_TSCONFIG = 'tsconfig.spec.json';

function buildTypecheckTarget(
  configFilePath: string,
  _options: unknown,
  context: CreateNodesContext,
): CreateNodesResult {
  const projectRoot = configFilePath.split('/').slice(0, -1).join('/');

  const tsconfig = findTsconfig(configFilePath);

  if (!tsconfig) return {};

  /** Vitest strips types without checking them, so a project's specs are only type-checked here. */
  const hasSpecs = existsSync(join(context.workspaceRoot, projectRoot, SPEC_TSCONFIG));
  const tsconfigs = hasSpecs ? [tsconfig, SPEC_TSCONFIG] : [tsconfig];

  const target: TargetConfiguration = {
    executor: 'nx:run-commands',
    cache: true,
    inputs: ['default', '^default', 'plugins'],
    outputs: [], // absolutely no files written
    options: {
      cwd: `{projectRoot}`,
      commands: tsconfigs.map((config) => `tsc -p ${config} --noEmit`),
      parallel: false,
      color: true,
    },
  };

  return {
    projects: {
      [projectRoot]: {
        targets: {
          typecheck: target,
        },
      },
    },
  };
}

export const createNodesV2: CreateNodes = [
  // Only match tsconfig.app.json and tsconfig.lib.json to avoid duplicate targets
  '**/{tsconfig.app.json,tsconfig.lib.json}',
  async (configFilePaths, options, context) => {
    return await createNodesFromFiles(buildTypecheckTarget, configFilePaths, options, context);
  },
];

export const createNodes = createNodesV2;

export default createNodesV2;
