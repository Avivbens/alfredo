import { alfredSchemas } from 'fast-alfred/schemas';
import { LlmSettingsSchema, toLlmSettings } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';

export const SettingsSchema = LlmSettingsSchema.extend({
  use_application_context: alfredSchemas.checkbox().default(false),
  translate_languages: alfredSchemas.list().default(['English', 'Spanish', 'French']),
}).transform((env) => ({
  ...toLlmSettings(env, DEFAULT_DEBOUNCE_TIME),
  useApplicationContext: env.use_application_context,
  translateLanguages: env.translate_languages,
}));
