import { FastAlfred } from 'fast-alfred';
import { exec } from 'node:child_process';
import { type JiraTicket } from '../models/jira-ticket.model';
import { SettingsSchema } from '../models/settings.model';
import { createJiraIssue } from '../services/jira-api.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const ticket: JiraTicket = JSON.parse(alfredClient.input);

    const { jira } = alfredClient.env.parse(SettingsSchema);

    if (!jira.baseUrl || !jira.username || !jira.apiToken || !jira.projectKey) {
      throw new Error('Jira configuration missing.');
    }

    const result = await createJiraIssue(jira, ticket);

    exec(`open "${result.url}"`);
  } catch (error) {
    alfredClient.error(error);
  }
})();
