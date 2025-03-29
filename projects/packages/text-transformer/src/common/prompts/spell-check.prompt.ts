import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const SPELL_CHECK_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Spell check the text, DO NOT correct grammar mistakes - just typos. Make sure you are not changing any text that is spelled correctly.`,
});

export const SPELL_CHECK_SYSTEM_PROMPT = createBaseTransformPrompt(SPELL_CHECK_INSTRUCTION);
