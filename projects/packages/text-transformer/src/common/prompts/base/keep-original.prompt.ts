/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const KEEP_ORIGINAL_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: [],
  template: `
Keep the text as close to the original as possible.
In case of line breaking, try really hard to keep the same line breaks as in the original text.`,
});

export const KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'KEEP_ORIGINAL_SYSTEM_PROMPT',
  prompt: KEEP_ORIGINAL_SYSTEM_PROMPT,
};
