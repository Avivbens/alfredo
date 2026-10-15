import { z } from 'zod';

export enum AvailableModels {
  /* Anthropic */
  CLAUDE_HAIKU_5_5 = 'claude-haiku-5-5',

  /* Google */
  GOOGLE_GEMINI_4_ARGON = 'gemini-4-argon',
  GOOGLE_GEMINI_3_8_FLASH = 'gemini-3.8-flash',
  GOOGLE_GEMINI_3_5_FLASH_LITE = 'gemini-3.5-flash-lite',

  /* OpenAI */
  GPT_6_ASTRA = 'gpt-6-astra',
  GPT_6_1_SOL = 'gpt-6.1-sol',
  GPT_6_LUNA = 'gpt-6-luna',
}

export const AvailableModelsSchema = z.nativeEnum(AvailableModels);
