import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { callModel } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { SUMMARIZE_SYSTEM_PROMPT } from '../common/prompts/summarize.prompt';
import { SettingsSchema } from '../models/settings.model';

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

    const system = await SUMMARIZE_SYSTEM_PROMPT(useApplicationContext).format({ applicationContext });

    const res = await callModel(token, model, { system, user: alfredClient.input });

    const items: AlfredListItem[] = [
      {
        title: res,
        subtitle: 'Summarize',
        arg: res,
        mods: {
          cmd: {
            subtitle: 'Preview',
            arg: res,
          },
        },
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
