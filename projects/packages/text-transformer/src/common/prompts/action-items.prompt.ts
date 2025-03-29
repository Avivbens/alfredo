import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const ACTION_ITEMS_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Extract out from the text the most important information and rephrase it in a clear and concise way.
Make a short list of items out of it.`,
});

export const ACTION_ITEMS_SYSTEM_PROMPT = createBaseTransformPrompt(ACTION_ITEMS_INSTRUCTION);
