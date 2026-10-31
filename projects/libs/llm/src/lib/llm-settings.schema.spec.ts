import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { AvailableModels } from './available-models.enum';
import { LlmSettingsSchema, toLlmSettings } from './llm-settings.schema';

describe('llm-settings.schema', () => {
  describe('LlmSettingsSchema', () => {
    it('should read the token, model and debounce time Alfred passes', () => {
      const env = LlmSettingsSchema.parse({ llm_token: 'sk-123', selected_model: 'gpt-6-luna', debounce_time: '250' });

      expect(toLlmSettings(env, 300)).toEqual({
        token: 'sk-123',
        model: AvailableModels.GPT_6_LUNA,
        debounceTime: 250,
      });
    });

    it('should read blank fields as unset, so the workflow reports them as missing', () => {
      const env = LlmSettingsSchema.parse({ llm_token: '', selected_model: '' });

      expect(toLlmSettings(env, 300)).toEqual({ token: undefined, model: undefined, debounceTime: 300 });
    });

    it('should reject a model the workflow does not offer', () => {
      expect(() => LlmSettingsSchema.parse({ selected_model: 'gpt-2' })).toThrow(ZodError);
    });
  });
});
