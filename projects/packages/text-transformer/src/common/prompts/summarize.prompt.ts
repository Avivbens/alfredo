import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

export const SUMMARIZE_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM, // Added this missing parameter
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

You are an expert summarizer. Your task is to read the provided text and create a concise summary that captures the main points and key information.

- **Identify the core ideas** and essential details.
- **Structure the summary** as a bulleted or numbered list for maximum clarity.
- **Be concise.** Omit filler words and redundant information.
- **Preserve the original meaning.** Do not add your own opinions or interpretations.

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
