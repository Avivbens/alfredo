import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { type AvailableModels, AvailableModelsSchema } from './available-models.enum';

/** Alfred passes an empty string for a blank field, which has to read the same as a field never set. */
const OptionalTextSchema = z
  .string()
  .optional()
  .transform((value) => value || undefined);

/** Every LLM workflow configures these under the same variable names, so workflows extend this one schema. */
export const LlmSettingsSchema = z.object({
  llm_token: OptionalTextSchema,
  selected_model: OptionalTextSchema.pipe(AvailableModelsSchema.optional()),
  debounce_time: alfredSchemas.number().optional(),
});

export interface LlmSettings {
  token: string | undefined;
  model: AvailableModels | undefined;
  debounceTime: number;
}

/** Token and model stay optional, since each workflow reports missing configuration in its own way. */
export function toLlmSettings(env: z.infer<typeof LlmSettingsSchema>, defaultDebounceTime: number): LlmSettings {
  return {
    token: env.llm_token,
    model: env.selected_model,
    debounceTime: env.debounce_time ?? defaultDebounceTime,
  };
}
