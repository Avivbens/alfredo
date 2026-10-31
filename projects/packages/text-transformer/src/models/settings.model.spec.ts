import { describe, expect, it } from 'vitest';
import { AvailableModels } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { SettingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('SettingsSchema', () => {
    it('should read the values Alfred passes from the configuration fields', () => {
      expect(
        SettingsSchema.parse({
          llm_token: 'sk-123',
          selected_model: 'claude-haiku-5-5',
          debounce_time: '150',
          use_application_context: '1',
          translate_languages: 'English, Hebrew',
        }),
      ).toEqual({
        token: 'sk-123',
        model: AvailableModels.CLAUDE_HAIKU_5_5,
        debounceTime: 150,
        useApplicationContext: true,
        translateLanguages: ['English', 'Hebrew'],
      });
    });

    it("should fall back to the workflow's defaults", () => {
      expect(SettingsSchema.parse({})).toMatchObject({
        debounceTime: DEFAULT_DEBOUNCE_TIME,
        useApplicationContext: false,
        translateLanguages: ['English', 'Spanish', 'French'],
      });
    });
  });
});
