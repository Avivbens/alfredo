import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'plist';
import { describe, expect, it } from 'vitest';

type Workflow = {
  objects: { type: string; uid: string; config: Record<string, unknown> }[];
  connections: Record<string, { destinationuid: string }[]>;
  uidata: Record<string, unknown>;
};

async function loadWorkflow(): Promise<Workflow> {
  return parse(await readFile(join(import.meta.dirname, '..', 'info.plist'), 'utf8')) as Workflow;
}

describe('info.plist', () => {
  describe('agenda script filter', () => {
    it('should stay optional-argument and Alfred-filtered so typing after the keyword filters the rows', async () => {
      const workflow = await loadWorkflow();
      const filter = workflow.objects.find(
        ({ type, config }) =>
          type === 'alfred.workflow.input.scriptfilter' && config.keyword === '{var:ai_agenda_keyword}',
      );

      expect(filter?.config.argumenttype).toBe(1);
      expect(filter?.config.alfredfiltersresults).toBe(true);
    });
  });

  describe.each(['agenda-action', 'create-event'])('%s run script', (entry) => {
    it('should post its output as a notification only when there is one, so a failure is never silent', async () => {
      const workflow = await loadWorkflow();
      const runScript = workflow.objects.find(
        ({ type, config }) =>
          type === 'alfred.workflow.action.script' && String(config.script).includes(`esbuild/${entry}.js`),
      );
      const targets = (workflow.connections[runScript?.uid ?? ''] ?? []).map(({ destinationuid }) =>
        workflow.objects.find(({ uid }) => uid === destinationuid),
      );

      expect(targets).toEqual([
        expect.objectContaining({
          type: 'alfred.workflow.output.notification',
          config: expect.objectContaining({
            title: 'AI Calendar Assistant',
            text: '{query}',
            onlyshowifquerypopulated: true,
          }),
        }),
      ]);
      expect(workflow.uidata[targets[0]?.uid ?? '']).toBeDefined();
    });
  });
});
