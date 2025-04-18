import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

export const EXPLAIN_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

Explain the text clearly and concisely. You can rephrase the text to make it more understandable. Ensure you are not adding too much information.
You can add an explanation about the text but keep it short and to the point.

{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
