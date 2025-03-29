import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseExplanationPrompt } from './base-prompts';

const SUMMARIZE_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `Summarize the text in a clear and concise way. You can rephrase the text to make it more readable. Make sure you are not changing the meaning of the text.
Keep the summary short and to the point.
You can add indentation to the original text, if needed.`,
});

export const SUMMARIZE_SYSTEM_PROMPT = createBaseExplanationPrompt(SUMMARIZE_INSTRUCTION);
