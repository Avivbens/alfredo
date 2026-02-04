import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { AvailableModelsSchema, callModelWithStructuredResponse } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME, LANGUAGE_DELIMITER } from '../../common/defaults.constants';
import { TRANSLATE_SYSTEM_PROMPT } from '../../common/prompts/translate.prompt';
import { Variables } from '../../common/variables.enum';
import { translateResultSchema } from '../../models/translate-results.schema';

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

  const hasDelimiter = trimmedInput.includes(LANGUAGE_DELIMITER);
  const [targetLanguage, ...textParts] = trimmedInput.split(LANGUAGE_DELIMITER);

  /**
   * If delimiter is found and target language is specified
   */
  if (hasDelimiter && targetLanguage) {
    return {
      targetLanguage: targetLanguage.trim(),
      textToTranslate: textParts.join(LANGUAGE_DELIMITER).trim(),
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

    // Parse the input to extract target language and text
    const { targetLanguage, textToTranslate } = parseLanguageFromInput(input);

    alfredClient.log(`Translating to: ${targetLanguage}`);

    const system = await TRANSLATE_SYSTEM_PROMPT(useApplicationContext).format({
      applicationContext,
      targetLanguage,
    });

    /**
     * Call the model with structured response parsing
     */
    const { translation, sourceLanguage } = await callModelWithStructuredResponse(
      token,
      model,
      { system, user: textToTranslate },
      translateResultSchema,
    );

    const subtitle = sourceLanguage ? `${sourceLanguage} => ${targetLanguage}` : `Translated to ${targetLanguage}`;
    const items: AlfredListItem[] = [
      {
        title: translation,
        subtitle,
        arg: translation,
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
