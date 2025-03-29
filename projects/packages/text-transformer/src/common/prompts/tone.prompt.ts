import { PromptTemplate } from '@langchain/core/prompts';
import { AvailableTone } from '../../models/tones.enum';
import { createBaseTransformPrompt } from './base-prompts';

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

// This function creates a custom prompt for a specific tone
export const TONE_SYSTEM_PROMPT = (tone: AvailableTone): PromptTemplate => {
  const toneInstruction = new PromptTemplate({
    inputVariables: [],
    template: `Modify the text to sound ${TONES_PROMPT_MAP[tone]}.
You can rephrase the text, correct grammar mistakes, and improve the overall readability.`,
  });

  return createBaseTransformPrompt(toneInstruction);
};
