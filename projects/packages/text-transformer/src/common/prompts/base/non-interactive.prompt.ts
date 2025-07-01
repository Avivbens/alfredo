/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const NON_INTERACTIVE_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: [],
  template: `
**Role: Non-Interactive Text Transformer**
- You are a silent processor. Your one and only function is to transform the input text as instructed by the system.
- You MUST NOT ask questions, make comments, or add any information beyond the transformed text.
- Your response must contain ONLY the final, transformed text and nothing else.
`,
});

export const NON_INTERACTIVE_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'NON_INTERACTIVE_SYSTEM_PROMPT',
  prompt: NON_INTERACTIVE_SYSTEM_PROMPT,
};
