import * as path from 'path';
import type { Tree } from '@nx/devkit';
import { addProjectConfiguration, formatFiles, generateFiles, readProjectConfiguration } from '@nx/devkit';
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
      test: {},
      lint: {},
    },
  });

  const { root } = readProjectConfiguration(tree, name);
  const projectNameTitleCase = name.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  generateFiles(tree, path.join(__dirname, 'files'), root, { ...options, nameTitleCase: projectNameTitleCase });
  await formatFiles(tree);
}

export default generateWorkflowGenerator;
