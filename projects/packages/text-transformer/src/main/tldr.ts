import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { AvailableModelsSchema, callModel } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { TLDR_SYSTEM_PROMPT } from '../common/prompts/tldr.prompt';
import { Variables } from '../common/variables.enum';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('text-transformer'));

  try {
    const denounceTime = alfredClient.env.getEnv(Variables.DEBOUNCE_TIME, {
      defaultValue: DEFAULT_DEBOUNCE_TIME,
      parser: Number,
    });
    const token: string | undefined = alfredClient.env.getEnv(Variables.LLM_TOKEN);
    const rawModel = alfredClient.env.getEnv(Variables.SELECTED_MODEL);
    const model = rawModel ? AvailableModelsSchema.parse(rawModel) : undefined;

    if (!token || !model) {
      throw new Error('Token or model is not defined!');
    }

    const useApplicationContext: boolean = alfredClient.env.getEnv(Variables.USE_APPLICATION_CONTEXT, {
      defaultValue: false,
      parser: (value) => (value as '0' | '1') === '1',
    });

    const applicationContext = useApplicationContext && (await getActiveApp());
    alfredClient.log(JSON.stringify({ useApplicationContext, applicationContext }, null, 2));

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(denounceTime);

    if (!alfredClient.input) {
      throw new Error('Input is required');
    }

    const system = await TLDR_SYSTEM_PROMPT(useApplicationContext).format({ applicationContext });

    const res = await callModel(token, model, { system, user: alfredClient.input });

    const items: AlfredListItem[] = [
      {
        title: res,
        subtitle: 'Translate',
        arg: res,
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
