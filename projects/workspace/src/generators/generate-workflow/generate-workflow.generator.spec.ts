import { beforeEach, describe, expect, it } from 'vitest';
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

  it('should generate a Vitest config built on the shared one, so the workflow gets a test target', async () => {
    await generateWorkflowGenerator(tree, options);
    expect(tree.read('projects/packages/test/vitest.config.mts', 'utf-8')).toContain(
      "from '../../../vitest.shared.mts'",
    );
  });
});
