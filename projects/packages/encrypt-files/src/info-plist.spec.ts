import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'plist';
import { describe, expect, it } from 'vitest';

type WorkflowObject = { type: string; uid: string; config: Record<string, unknown> };
type Workflow = {
  objects: WorkflowObject[];
  connections: Record<string, { destinationuid: string }[]>;
  userconfigurationconfig?: { type: string; variable: string; label: string; config: Record<string, unknown> }[];
};

async function loadWorkflow(): Promise<Workflow> {
  const xml = await readFile(join(import.meta.dirname, '..', 'info.plist'), 'utf8');

  return parse(xml) as Workflow;
}

function targetsOf(workflow: Workflow, source: WorkflowObject | undefined): WorkflowObject[] {
  const connections = workflow.connections[source?.uid ?? ''] ?? [];

  return connections
    .map(({ destinationuid }) => workflow.objects.find(({ uid }) => uid === destinationuid))
    .filter((target): target is WorkflowObject => target !== undefined);
}

describe('info.plist', () => {
  it('should offer one action for files, so it shows in the action menu for a Finder selection', async () => {
    const workflow = await loadWorkflow();
    const triggers = workflow.objects.filter(({ type }) => type === 'alfred.workflow.trigger.universalaction');

    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.config).toEqual({
      acceptsfiles: true,
      acceptsmulti: 1,
      acceptstext: false,
      acceptsurls: false,
      name: 'Encrypt with Password',
    });
  });

  it('should hand every selected file to the script as its own argument', async () => {
    const workflow = await loadWorkflow();
    const trigger = workflow.objects.find(({ type }) => type === 'alfred.workflow.trigger.universalaction');
    const targets = targetsOf(workflow, trigger);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.type).toBe('alfred.workflow.action.script');
    expect(targets[0]?.config).toMatchObject({
      type: 11,
      scriptargtype: 1,
      concurrently: false,
      script: './esbuild/assets/run-node.sh esbuild/encrypt-files.js "$@"',
    });
  });

  it('should post the script output as a notification only when there is one, so a cancel stays silent', async () => {
    const workflow = await loadWorkflow();
    const script = workflow.objects.find(({ type }) => type === 'alfred.workflow.action.script');
    const targets = targetsOf(workflow, script);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.type).toBe('alfred.workflow.output.notification');
    expect(targets[0]?.config).toMatchObject({
      text: '{query}',
      onlyshowifquerypopulated: true,
      title: 'Encrypt Files',
    });
  });

  it('should offer Hide file names as a setting that starts off', async () => {
    const workflow = await loadWorkflow();
    const settings = workflow.userconfigurationconfig ?? [];

    expect(settings).toHaveLength(1);
    expect(settings[0]).toMatchObject({
      type: 'checkbox',
      variable: 'hide_file_names',
      label: 'Hide file names',
      config: { default: false },
    });
  });

  it('should carry no keyword search list and no updater objects', async () => {
    const workflow = await loadWorkflow();
    const types = workflow.objects.map(({ type }) => type);
    const uids = workflow.objects.map(({ uid }) => uid);

    expect(types).not.toContain('alfred.workflow.input.scriptfilter');
    expect(uids.filter((uid) => uid.startsWith('__fast-alfred_managed__'))).toEqual([]);
  });
});
