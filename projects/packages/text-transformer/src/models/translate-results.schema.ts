import z from 'zod';

export const translateResultSchema = z.object({
  translation: z.string(),
  sourceLanguage: z
    .string()
    .describe(
      'The original language of the provided text. Should be the full name of the language, e.g., "English", "Spanish", "French".',
    ),
});
