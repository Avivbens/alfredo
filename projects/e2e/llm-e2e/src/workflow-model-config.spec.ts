import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';
import { parse } from 'plist';
import { describe, expect, it } from 'vitest';
import { AvailableModels } from '@alfredo/llm';
import { DependencyType, readCachedProjectGraph, workspaceRoot } from '@nx/devkit';
import { INFO_PLIST_FILE, MODEL_VARIABLE } from './common/workflow.constants';
import { InfoPlistSchema, type ModelPopup, ModelPopupSchema } from './schemas/info-plist.schema';
import { createNxTaskEnvSchema } from './schemas/nx-task-env.schema';

const graph = readCachedProjectGraph();

const { NX_TASK_TARGET_PROJECT: E2E_PROJECT } = createNxTaskEnvSchema(graph).parse(env);
const e2eDependencies = graph.dependencies[E2E_PROJECT] ?? [];

function testedLibrary() {
  const [library, ...others] = e2eDependencies
    .filter(({ type, target }) => type === DependencyType.static && target in graph.nodes)
    .map(({ target }) => target);

  if (!library || others.length) {
    throw new Error(`"${E2E_PROJECT}" must import exactly one workspace library, the one under test`);
  }

  return library;
}

const LLM_PROJECT = testedLibrary();

/**
 * The workflows under test are this project's `implicitDependencies`, so `nx affected` re-runs it whenever
 * one of their plists changes - Alfred feeds the popup value straight into `AvailableModelsSchema.parse`.
 */
const coveredWorkflows = e2eDependencies
  .filter(({ type }) => type === DependencyType.implicit)
  .map(({ target }) => target)
  .sort();

const llmConsumers = Object.entries(graph.dependencies)
  .filter(([project, deps]) => project !== E2E_PROJECT && deps.some(({ target }) => target === LLM_PROJECT))
  .map(([project]) => project)
  .sort();

/** Vitest and zod failures don't say where they came from - prefix them with the workflow and its plist. */
function checkModelPopup(workflow: string, check: (config: ModelPopup['config']) => void) {
  const node = graph.nodes[workflow];
  if (!node) {
    throw new Error(`Project "${workflow}" is missing from the Nx project graph`);
  }

  const plistPath = join(node.data.root, INFO_PLIST_FILE);

  try {
    const { userconfigurationconfig } = InfoPlistSchema.parse(
      parse(readFileSync(join(workspaceRoot, plistPath), 'utf8')),
    );
    const { config } = ModelPopupSchema.parse(
      userconfigurationconfig.find(({ variable }) => variable === MODEL_VARIABLE),
    );

    check(config);
  } catch (error) {
    throw new Error(`Workflow "${workflow}" (${plistPath}):\n\n${error instanceof Error ? error.message : error}`, {
      cause: error,
    });
  }
}

describe('workflow model configuration', () => {
  it(`should cover every workflow that depends on "${LLM_PROJECT}"`, () => {
    expect(coveredWorkflows).toEqual(llmConsumers);
  });

  it.each(coveredWorkflows)('%s should be a required popup listing exactly the available models', (workflow) => {
    checkModelPopup(workflow, ({ pairs }) => {
      expect(pairs.map(([, model]) => model)).toEqual(Object.values(AvailableModels));
    });
  });

  it.each(coveredWorkflows)('%s should default to an available model', (workflow) => {
    checkModelPopup(workflow, (config) => {
      expect(Object.values(AvailableModels)).toContain(config.default);
    });
  });
});
