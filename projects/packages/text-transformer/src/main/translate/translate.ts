import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { AvailableModels, callModel } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME, LANGUAGE_DELIMITER } from '../../common/defaults.constants';
import { TRANSLATE_SYSTEM_PROMPT } from '../../common/prompts/translate.prompt';
import { Variables } from '../../common/variables.enum';

interface ParsedTranslationInput {
  targetLanguage: string;
  textToTranslate: string;
}

/**
 * Parses the input to extract target language and text to translate.
 * Format: "Language§ text to translate"
 * @param input - The raw input string
 * @returns Object containing the target language and text to translate
 */
function parseLanguageFromInput(input: string): ParsedTranslationInput {
  const trimmedInput = input.trim();

  const pattern = new RegExp(`^([^${LANGUAGE_DELIMITER}]+)${LANGUAGE_DELIMITER}\\s*(.*)$`);
  const match = trimmedInput.match(pattern);

  if (match && match[1] && match[2]) {
    return {
      targetLanguage: match[1].trim(),
      textToTranslate: match[2],
    };
  }

  /**
   * Default: translate to English if no language delimiter found
   */
  return {
    targetLanguage: 'English',
    textToTranslate: trimmedInput,
  };
}

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('text-transformer'));

  const input = alfredClient.input;
  if (!input) {
    return;
  }

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

    // Parse the input to extract target language and text
    const { targetLanguage, textToTranslate } = parseLanguageFromInput(input);

    const system = await TRANSLATE_SYSTEM_PROMPT(useApplicationContext).format({
      applicationContext,
      targetLanguage,
    });

    const res = await callModel(token, model, { system, user: textToTranslate });

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
