import { FastAlfred } from 'fast-alfred';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JiraTicketSchema } from '../models/jira-ticket.model';
import { SettingsSchema } from '../models/settings.model';
import { createJiraIssue } from '../services/jira-api.service';

const execFileAsync = promisify(execFile);

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const ticket = JiraTicketSchema.parse(JSON.parse(alfredClient.input));

    const { jira } = alfredClient.env.parse(SettingsSchema);

    if (!jira.baseUrl || !jira.username || !jira.apiToken || !jira.projectKey) {
      throw new Error('Jira configuration missing.');
    }

    const result = await createJiraIssue(jira, ticket);

    /** The URL carries the key Jira returned, so it goes to `open` as an argument, never through a shell. */
    await execFileAsync('open', [result.url]);
  } catch (error) {
    alfredClient.error(error);
  }
})();
