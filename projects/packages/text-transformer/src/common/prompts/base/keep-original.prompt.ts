/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const KEEP_ORIGINAL_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: [],
  template: `
**Formatting Rule: Preserve Original Structure**
- You MUST preserve the original line breaks and indentation of the text.
- Alter the text ONLY as required by the core transformation task. Do not make any other changes.
`,
});

export const KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'KEEP_ORIGINAL_SYSTEM_PROMPT',
  prompt: KEEP_ORIGINAL_SYSTEM_PROMPT,
};
