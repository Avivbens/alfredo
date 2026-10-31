import { describe, expect, it } from 'vitest';
import { AvailableModels } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME, DEFAULT_ISSUE_TYPE } from '../common/defaults.constants';
import { SettingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('SettingsSchema', () => {
    it('should read the LLM settings Alfred passes', () => {
      expect(
        SettingsSchema.parse({ llm_token: 'sk-123', selected_model: 'gpt-6-astra', debounce_time: '700' }),
      ).toMatchObject({ token: 'sk-123', model: AvailableModels.GPT_6_ASTRA, debounceTime: 700 });
    });

    it('should build the Jira config, with custom fields parsed from their JSON', () => {
      const { jira } = SettingsSchema.parse({
        jira_base_url: 'acme.atlassian.net',
        jira_username: 'me@acme.com',
        jira_api_token: 'token',
        jira_project_key: 'PROJ',
        custom_fields: '{"customfield_10187": {"value": "No"}}',
      });

      expect(jira).toEqual({
        baseUrl: 'acme.atlassian.net',
        username: 'me@acme.com',
        apiToken: 'token',
        projectKey: 'PROJ',
        defaultIssueType: DEFAULT_ISSUE_TYPE,
        autoAssignUserId: undefined,
        customFields: { customfield_10187: { value: 'No' } },
      });
    });

    it('should read blank custom fields as none, and fall back to the default debounce time', () => {
      expect(SettingsSchema.parse({ custom_fields: '' })).toMatchObject({
        debounceTime: DEFAULT_DEBOUNCE_TIME,
        jira: { customFields: undefined },
      });
    });

    it('should reject custom fields that are not a JSON object', () => {
      expect(() => SettingsSchema.parse({ custom_fields: '["not", "an", "object"]' })).toThrow();
    });
  });
});
