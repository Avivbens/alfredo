import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { callModel } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { TABLE_SYSTEM_PROMPT } from '../common/prompts/table.prompt';
import { SettingsSchema } from '../models/settings.model';
import { formatMarkdownTable } from '../utils/format-table.util';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('text-transformer'));

  try {
    const { token, model, debounceTime, useApplicationContext } = alfredClient.env.parse(SettingsSchema);

    if (!token || !model) {
      throw new Error('Token or model is not defined!');
    }

    const applicationContext = useApplicationContext && (await getActiveApp());
    alfredClient.log(JSON.stringify({ useApplicationContext, applicationContext }, null, 2));

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(debounceTime);

    if (!alfredClient.input) {
      throw new Error('Input is required');
    }

    const system = await TABLE_SYSTEM_PROMPT(useApplicationContext).format({ applicationContext });

    const res = await callModel(token, model, { system, user: alfredClient.input });
    const formatted = formatMarkdownTable(res);

    const items: AlfredListItem[] = [
      {
        title: formatted,
        subtitle: 'Markdown Table',
        arg: formatted,
        mods: {
          cmd: {
            subtitle: 'Preview',
            arg: formatted,
          },
        },
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
