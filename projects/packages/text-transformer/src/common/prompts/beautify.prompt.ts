import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const BEAUTIFY_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Make the text more readable and engaging. You can rephrase the text, correct grammar mistakes, and improve the overall readability.`,
});

export const BEAUTIFY_SYSTEM_PROMPT = createBaseTransformPrompt(BEAUTIFY_INSTRUCTION);
