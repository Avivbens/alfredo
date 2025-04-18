import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { AvailableTone } from '../../models/tones.enum';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

const TONES_PROMPT_MAP: Record<AvailableTone, string> = {
  [AvailableTone.PROFESSIONAL]: `more professional.
  Make sure the text is formal and business-like.
  Avoid using slang or colloquial language.
  Use proper grammar and punctuation. Make the text sound authoritative.

  You can add line breaking to the original ones, if needed.`,
  [AvailableTone.CASUAL]: `more casual. Make sure the text is friendly and conversational.
  Use everyday language and avoid jargon.`,
  [AvailableTone.FRIENDLY]: `more friendly. Make sure the text is warm and inviting.
  Use a conversational tone. Think of it as talking to a friend.

  You can use emojis and exclamation marks to make the text more engaging.`,
  [AvailableTone.HAPPY]: `happier. Make sure the text is upbeat and positive.
  Use cheerful language and exclamation marks to convey happiness.`,
};

export const TONE_SYSTEM_PROMPT = (tone: AvailableTone, useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

Modify the text to sound ${TONES_PROMPT_MAP[tone]}.
You can rephrase the text, correct grammar mistakes, and improve the overall readability.

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
