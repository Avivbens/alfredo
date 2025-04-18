import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { COMMIT_SYSTEM_PROMPT } from '../common/prompts/commit.prompt';
import { Variables } from '../common/variables.enum';
import { AvailableModels } from '../models/available-models.enum';
import { callModel } from '../services/llm.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const denounceTime = alfredClient.env.getEnv(Variables.DEBOUNCE_TIME, {
      defaultValue: DEFAULT_DEBOUNCE_TIME,
      parser: Number,
    });
    const token: string | undefined = alfredClient.env.getEnv(Variables.LLM_TOKEN);
    const model: AvailableModels | undefined = alfredClient.env.getEnv(Variables.SELECTED_MODEL);

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

    const system = await COMMIT_SYSTEM_PROMPT(useApplicationContext).format({ applicationContext });

    const res = await callModel(token, model, { system, user: alfredClient.input });

    const items: AlfredListItem[] = [
      {
        title: res,
        subtitle: 'Commit Style',
        arg: res,
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
