import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

export const SPELL_CHECK_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

Spell check the text, DO NOT correct grammar mistakes - just typos. Make sure you are not changing any text that is spelled correctly.

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
