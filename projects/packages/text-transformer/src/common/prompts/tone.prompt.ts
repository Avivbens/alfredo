import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { AvailableTone } from '../../models/tones.enum';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

const TONES_PROMPT_MAP: Record<AvailableTone, string> = {
  [AvailableTone.PROFESSIONAL]: `**Tone: Professional**
- Use formal, business-like language.
- Ensure the text sounds authoritative and confident.
- Avoid slang, colloquialisms, and contractions.`,
  [AvailableTone.CASUAL]: `**Tone: Casual**
- Use a relaxed, conversational, and informal style.
- Everyday language is appropriate, but maintain clarity.
- Contractions and colloquialisms are acceptable.`,
  [AvailableTone.FRIENDLY]: `**Tone: Friendly**
- Use a warm, inviting, and approachable voice.
- Write as if you're talking to a friend.
- Emojis and exclamation marks can be used to add warmth.`,
  [AvailableTone.HAPPY]: `**Tone: Happy**
- Use an upbeat, positive, and cheerful voice.
- Employ optimistic language and exclamation marks to convey enthusiasm.`,
  [AvailableTone.SIMPLE]: `**Tone: Simple**
- Use clear, concise, and straightforward language.
- Break down complex ideas into easy-to-understand points.
- Avoid jargon and overly complex sentences. Aim for the clarity of a well-written instructional guide.`,
};

export const TONE_SYSTEM_PROMPT = (tone: AvailableTone, useApplicationContext: boolean) => {
  const finalPrompt = PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

You are an expert writer and communication specialist. Your task is to rewrite the provided text to adopt a specific tone while preserving its core meaning.

**Instructions:**
1.  **Identify the target tone:** The required tone is specified below.
2.  **Rewrite the text:** Adjust the wording, phrasing, and sentence structure to match the target tone.
3.  **Preserve the message:** The fundamental information and intent of the original text MUST be maintained. Do not add or remove key information.

${TONES_PROMPT_MAP[tone]}

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`);

  return new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt,
  });
};
