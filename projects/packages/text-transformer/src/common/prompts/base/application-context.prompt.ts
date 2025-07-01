/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const APPLICATION_CONTEXT_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: ['applicationContext'],
  template: `
**Application Context:**
{applicationContext}

**Instruction:**
- You MUST use the provided application context to inform your response, adopting its tone, style, and terminology.
- If the context is irrelevant to the user's request, you MUST ignore it completely.
`,
});

export const APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'APPLICATION_CONTEXT_SYSTEM_PROMPT',
  prompt: APPLICATION_CONTEXT_SYSTEM_PROMPT,
};
