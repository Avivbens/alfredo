import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { TRANSLATE_SYSTEM_PROMPT } from '../common/prompts/translate.prompt';
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

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(denounceTime);

    if (!alfredClient.input) {
      throw new Error('Input is required');
    }

    const system = await TRANSLATE_SYSTEM_PROMPT.format({});
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
