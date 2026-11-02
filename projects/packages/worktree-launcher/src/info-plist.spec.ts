import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Connection = { destinationuid: string; modifiers: number; sourceoutputuid?: string };
type Workflow = {
  objects: { uid: string; type: string; config: { script?: string; keyword?: string } }[];
  connections: Record<string, Connection[]>;
};
type UpdatesHelpers = { dropUpdateHelpers: () => Promise<void>; includeUpdatesHelpers: () => Promise<void> };

const MANAGED_CONDITIONAL = '__fast-alfred_managed__v2_conditional_';
const MODIFIERS = { none: 0, cmd: 1048576, alt: 524288, shift: 131072 };

/** fast-alfred does not export its bundler helpers, so they are loaded from its install folder. */
const requireFromFastAlfred = createRequire(createRequire(import.meta.url).resolve('fast-alfred'));
const helpers: UpdatesHelpers = requireFromFastAlfred('./bundler/services/updates-helpers.service.js');
const { parse } = requireFromFastAlfred('plist') as { parse: (xml: string) => unknown };

async function readWorkflow(dir: string): Promise<Workflow> {
  return parse(await readFile(join(dir, 'info.plist'), 'utf8')) as Workflow;
}

/** Follows a connection through a managed conditional's else hop, as Alfred does for a normal query. */
function resolveDestination(workflow: Workflow, uid: string): string {
  if (!uid.startsWith(MANAGED_CONDITIONAL)) {
    return uid;
  }
  const elseHop = workflow.connections[uid]?.find((connection) => connection.sourceoutputuid === undefined);

  return elseHop ? resolveDestination(workflow, elseHop.destinationuid) : uid;
}

/** fast-alfred before 2.9.2 merged connections that differ only by modifier, hence one junction per modifier. */
function expectModifiersReachLaunch(workflow: Workflow, keyword: string, modifiers: number[]): void {
  const filter = workflow.objects.find(
    ({ type, config }) => type === 'alfred.workflow.input.scriptfilter' && config.keyword === keyword,
  );
  const connections = workflow.connections[filter?.uid ?? ''] ?? [];

  expect(connections.map((connection) => connection.modifiers).sort()).toEqual([...modifiers].sort());
  for (const connection of connections) {
    const junction = workflow.objects.find(
      ({ uid }) => uid === resolveDestination(workflow, connection.destinationuid),
    );
    const launch = workflow.connections[junction?.uid ?? '']?.map(({ destinationuid }) =>
      workflow.objects.find(({ uid }) => uid === destinationuid),
    );

    expect(junction?.type).toBe('alfred.workflow.utility.junction');
    expect(launch?.map((object) => object?.config.script)).toEqual([expect.stringContaining('esbuild/launch.js')]);
  }
}

function expectEveryModifierReachesLaunch(workflow: Workflow): void {
  expectModifiersReachLaunch(workflow, '{var:prs_keyword}', Object.values(MODIFIERS));
  expectModifiersReachLaunch(workflow, '{var:new_task_keyword}', [MODIFIERS.none, MODIFIERS.cmd]);
}

describe('info.plist', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'worktree-launcher-plist-'));
    await mkdir(join(dir, 'esbuild', 'assets'), { recursive: true });
    await writeFile(join(dir, 'esbuild', 'prs.js'), '');
    await writeFile(join(dir, 'esbuild', 'new-task.js'), '');
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

  describe('script filter modifiers', () => {
    it('should give the new task filter its own junction per modifier, each reaching launch.js', async () => {
      const workflow = await readWorkflow(dir);
      const filter = workflow.objects.find(({ config }) => config.keyword === '{var:new_task_keyword}');
      const destinations = (workflow.connections[filter?.uid ?? ''] ?? []).map((connection) =>
        resolveDestination(workflow, connection.destinationuid),
      );

      expect(filter?.config.script).toBe('./esbuild/assets/run-node.sh esbuild/new-task.js "$1"');
      expect(new Set(destinations).size).toBe(2);
    });

    it('should reach launch.js through a junction each, as committed', async () => {
      expectEveryModifierReachesLaunch(await readWorkflow(dir));
    });

    it('should keep every modifier after the bundler strips the updater helpers', async () => {
      await helpers.dropUpdateHelpers();

      expectEveryModifierReachesLaunch(await readWorkflow(dir));
    });

    it('should keep every modifier after the bundler adds the updater helpers back', async () => {
      await helpers.dropUpdateHelpers();
      await helpers.includeUpdatesHelpers();

      const workflow = await readWorkflow(dir);

      expectEveryModifierReachesLaunch(workflow);
      expect(workflow.objects.some(({ uid }) => uid.startsWith(MANAGED_CONDITIONAL))).toBe(true);
    });
  });
});
