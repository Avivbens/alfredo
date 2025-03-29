import type { Tree } from '@nx/devkit';
import { readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generateWorkflowGenerator from './generate-workflow.generator';
import type { GenerateWorkflowGeneratorSchema } from './generate-workflow.schema';

describe('generate-workflow generator', () => {
  let tree: Tree;
  const options: GenerateWorkflowGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generateWorkflowGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });
});
