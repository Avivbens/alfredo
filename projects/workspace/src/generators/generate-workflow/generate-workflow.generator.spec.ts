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

  it('should generate an info.plist whose script filter runs the starter entry, so the workflow builds right away', async () => {
    await generateWorkflowGenerator(tree, options);

    const plist = tree.read('projects/packages/test/info.plist', 'utf-8');
    expect(plist).toContain('<string>com.alfredapp.avivbens.test</string>');
    expect(plist).toContain('<string>alfred.workflow.input.scriptfilter</string>');
    expect(plist).toContain('<string>./esbuild/assets/run-node.sh esbuild/test.js "$1"</string>');
  });

  it('should generate a starter entry, so lint and typecheck have a file to work on', async () => {
    await generateWorkflowGenerator(tree, options);

    expect(tree.read('projects/packages/test/src/main/test.ts', 'utf-8')).toContain('new FastAlfred()');
  });

  it('should leave no .gitkeep placeholders behind', async () => {
    await generateWorkflowGenerator(tree, options);

    expect(tree.exists('projects/packages/test/src/.gitkeep')).toBe(false);
    expect(tree.exists('projects/packages/test/src/main/.gitkeep')).toBe(false);
  });

  it('should give each workflow its own script filter uid, since Alfred keys objects by it', async () => {
    await generateWorkflowGenerator(tree, { name: 'first' });
    await generateWorkflowGenerator(tree, { name: 'second' });

    const uidOf = (name: string) =>
      tree.read(`projects/packages/${name}/info.plist`, 'utf-8')?.match(/<key>uid<\/key>\s*<string>([^<]+)</)?.[1];
    expect(uidOf('first')).toMatch(/^[0-9A-F-]{36}$/);
    expect(uidOf('first')).not.toBe(uidOf('second'));
  });
});
