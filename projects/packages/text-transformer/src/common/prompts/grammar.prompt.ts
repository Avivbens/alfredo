import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const GRAMMAR_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Spell check the text and correct grammar mistakes. You can also rephrase the text to make it more readable. Make sure you are not changing any text that is spelled correctly.`,
});

export const GRAMMAR_SYSTEM_PROMPT = createBaseTransformPrompt(GRAMMAR_INSTRUCTION);
