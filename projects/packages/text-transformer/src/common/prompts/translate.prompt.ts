import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const TRANSLATE_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Translate the text to the given language code provided at the very beginning of the sentence. For example, "fr Hello there", would be translated to French, or "de Hello there", would be translated to German.
Drop the language code at the beginning of the sentence - keep just the translated text in the target language.

In case there is no language code at the beginning of the sentence, the text should be translated to English.`,
});

export const TRANSLATE_SYSTEM_PROMPT = createBaseTransformPrompt(TRANSLATE_INSTRUCTION);
