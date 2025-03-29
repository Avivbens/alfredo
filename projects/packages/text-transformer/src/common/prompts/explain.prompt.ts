import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseExplanationPrompt } from './base-prompts';

const EXPLAIN_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Explain the text clearly and concisely. You can rephrase the text to make it more understandable. Ensure you are not adding too much information.
You can add an explanation about the text but keep it short and to the point.`,
});

export const EXPLAIN_SYSTEM_PROMPT = createBaseExplanationPrompt(EXPLAIN_INSTRUCTION);
