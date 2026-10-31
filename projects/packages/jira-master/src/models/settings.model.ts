import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { LlmSettingsSchema, toLlmSettings } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME, DEFAULT_ISSUE_TYPE } from '../common/defaults.constants';

export const SettingsSchema = LlmSettingsSchema.extend({
  title_example: z.string().optional(),
  jira_base_url: z.string().default(''),
  jira_username: z.string().default(''),
  jira_api_token: z.string().default(''),
  jira_project_key: z.string().default(''),
  jira_default_issue_type: z.string().default(DEFAULT_ISSUE_TYPE),
  auto_assign_user_id: z.string().optional(),
  /** Alfred passes an empty string for the blank textarea, which means no custom fields. */
  custom_fields: z
    .string()
    .optional()
    .transform((value) => value || undefined)
    .pipe(alfredSchemas.json(z.record(z.string(), z.unknown())).optional()),
}).transform((env) => ({
  ...toLlmSettings(env, DEFAULT_DEBOUNCE_TIME),
  titleExample: env.title_example,
  jira: {
    baseUrl: env.jira_base_url,
    username: env.jira_username,
    apiToken: env.jira_api_token,
    projectKey: env.jira_project_key,
    defaultIssueType: env.jira_default_issue_type,
    autoAssignUserId: env.auto_assign_user_id,
    customFields: env.custom_fields,
  },
}));

export type Settings = z.infer<typeof SettingsSchema>;
