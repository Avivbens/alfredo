import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Connection = { destinationuid: string; modifiers: number; sourceoutputuid?: string };
type Workflow = {
  objects: { uid: string; type: string }[];
  connections: Record<string, Connection[]>;
};
type UpdatesHelpers = { dropUpdateHelpers: () => Promise<void>; includeUpdatesHelpers: () => Promise<void> };

const MANAGED_CONDITIONAL = '__fast-alfred_managed__v2_conditional_';
const UPDATE_HELPERS = [
  '__fast-alfred_managed__v2_updater_workflow-update',
  '__fast-alfred_managed__v2_updater_snooze',
];
const MODIFIERS = { none: 0, alt: 524288, cmd: 1048576 };

/** fast-alfred does not export its bundler helpers, so they are loaded from its install folder */
const requireFromFastAlfred = createRequire(createRequire(import.meta.url).resolve('fast-alfred'));
const helpers: UpdatesHelpers = requireFromFastAlfred('./bundler/services/updates-helpers.service.js');
const { parse } = requireFromFastAlfred('plist') as { parse: (xml: string) => unknown };

async function readWorkflow(dir: string): Promise<Workflow> {
  return parse(await readFile(join(dir, 'info.plist'), 'utf8')) as Workflow;
}

/**
 * The update row acts on ↩, ⌘↩ and ⌥↩, and fast-alfred only wires it into connections that already leave the script filter.
 * Specs never assume the committed state: a local build strips the helpers from this same file, and Nx may run it first.
 */
function expectUpdateRowWired(workflow: Workflow): void {
  const filter = workflow.objects.find(({ type }) => type === 'alfred.workflow.input.scriptfilter');
  const connections = workflow.connections[filter?.uid ?? ''] ?? [];

  expect(connections.map(({ modifiers }) => modifiers).sort((a, b) => a - b)).toEqual([
    MODIFIERS.none,
    MODIFIERS.alt,
    MODIFIERS.cmd,
  ]);
  for (const { destinationuid } of connections) {
    const updateHops = (workflow.connections[destinationuid] ?? [])
      .filter(({ sourceoutputuid }) => sourceoutputuid !== undefined)
      .map(({ destinationuid: helper }) => helper);

    expect(destinationuid.startsWith(MANAGED_CONDITIONAL)).toBe(true);
    expect(updateHops).toEqual(expect.arrayContaining(UPDATE_HELPERS));
  }
}

describe('info.plist', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'weather-plist-'));
    await mkdir(join(dir, 'esbuild', 'assets'), { recursive: true });
    await writeFile(join(dir, 'esbuild', 'weather.js'), '');
    await writeFile(
      join(dir, '.fast-alfred.config.cjs'),
      `module.exports = { updates: { bundleHelpers: true, userConfiguration: { checkUpdatesCheckbox: true } } };`,
    );
    await cp(join(import.meta.dirname, '..', 'info.plist'), join(dir, 'info.plist'));
    vi.spyOn(process, 'cwd').mockReturnValue(dir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  describe('update row', () => {
    it('should keep ↩, ⌘↩ and ⌥↩ on the junction when the bundler strips the helpers', async () => {
      await helpers.dropUpdateHelpers();

      const workflow = await readWorkflow(dir);
      const filter = workflow.objects.find(({ type }) => type === 'alfred.workflow.input.scriptfilter');
      const junction = workflow.objects.find(({ type }) => type === 'alfred.workflow.utility.junction');
      const connections = workflow.connections[filter?.uid ?? ''] ?? [];

      expect(connections.map(({ modifiers }) => modifiers).sort((a, b) => a - b)).toEqual([
        MODIFIERS.none,
        MODIFIERS.alt,
        MODIFIERS.cmd,
      ]);
      expect(new Set(connections.map(({ destinationuid }) => destinationuid))).toEqual(new Set([junction?.uid]));
    });

    it('should reach the update and snooze helpers once the bundler adds them', async () => {
      await helpers.dropUpdateHelpers();
      await helpers.includeUpdatesHelpers();

      expectUpdateRowWired(await readWorkflow(dir));
    });
  });
});
