/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const APPLICATION_CONTEXT_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: ['applicationContext'],
  template: `
The application context is: {applicationContext}.
Use this information to provide a more relevant response.
If the application context is not relevant, ignore it.
`,
});

export const APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'APPLICATION_CONTEXT_SYSTEM_PROMPT',
  prompt: APPLICATION_CONTEXT_SYSTEM_PROMPT,
};
