import { FastAlfred } from 'fast-alfred';
import { exec } from 'node:child_process';
import { DEFAULT_ISSUE_TYPE } from '../common/defaults.constants';
import { Variables } from '../common/variables.enum';
import { type JiraTicket } from '../models/jira-ticket.model';
import { createJiraIssue } from '../services/jira-api.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const ticket: JiraTicket = JSON.parse(alfredClient.input);

    const jiraBaseUrl = alfredClient.env.getEnv<string>(Variables.JIRA_BASE_URL);
    const jiraUsername = alfredClient.env.getEnv<string>(Variables.JIRA_USERNAME);
    const jiraApiToken = alfredClient.env.getEnv<string>(Variables.JIRA_API_TOKEN);
    const jiraProjectKey = alfredClient.env.getEnv<string>(Variables.JIRA_PROJECT_KEY);

    if (!jiraBaseUrl || !jiraUsername || !jiraApiToken || !jiraProjectKey) {
      throw new Error('Jira configuration missing.');
    }

    const defaultIssueType = alfredClient.env.getEnv(Variables.JIRA_DEFAULT_ISSUE_TYPE, {
      defaultValue: DEFAULT_ISSUE_TYPE,
    });
    const autoAssignUserId = alfredClient.env.getEnv(Variables.AUTO_ASSIGN_USER_ID, {
      defaultValue: undefined,
    });

    const result = await createJiraIssue(
      {
        baseUrl: jiraBaseUrl,
        username: jiraUsername,
        apiToken: jiraApiToken,
        projectKey: jiraProjectKey,
        defaultIssueType,
        autoAssignUserId,
      },
      ticket,
    );

    exec(`open "${result.url}"`);
  } catch (error) {
    alfredClient.error(error);
  }
})();
