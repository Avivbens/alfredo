import { randomUUID } from 'node:crypto';
import * as path from 'path';
import type { Tree } from '@nx/devkit';
import { addProjectConfiguration, formatFiles, generateFiles, readProjectConfiguration } from '@nx/devkit';
import { installWorkspacePackages } from '../common/install-workspace-packages';
import type { GenerateWorkflowGeneratorSchema } from './generate-workflow.schema';

export async function generateWorkflowGenerator(tree: Tree, options: GenerateWorkflowGeneratorSchema) {
  const { name } = options;

  const projectRoot = `projects/packages/${name}`;
  addProjectConfiguration(tree, name, {
    sourceRoot: '{projectRoot}/src',
    root: projectRoot,
    projectType: 'application',
    tags: [],
    targets: {
      build: {
        defaultConfiguration: 'local',
      },
      serve: {},
      lint: {},
    },
  });

  const { root } = readProjectConfiguration(tree, name);
  const projectNameTitleCase = name.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  /** The starter info.plist and entry make a new workflow lint and build before anyone opens it in Alfred, so CI passes from the first commit. */
  generateFiles(tree, path.join(__dirname, 'files'), root, {
    ...options,
    nameTitleCase: projectNameTitleCase,
    uid: randomUUID().toUpperCase(),
  });
  await formatFiles(tree);

  return installWorkspacePackages(tree);
}

export default generateWorkflowGenerator;
