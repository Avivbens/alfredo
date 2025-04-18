import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

export const TRANSLATE_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

Translate the text to the given language code provided at the very beginning of the sentence. For example, "fr Hello there", would be translated to French, or "de Hello there", would be translated to German.
Drop the language code at the beginning of the sentence - keep just the translated text in the target language.

In case there is no language code at the beginning of the sentence, the text should be translated to English.

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
