import { markdownToAdf } from 'marklassian';
import type {
  AdfDocument,
  JiraErrorResponse,
  JiraField,
  JiraIssueCreationResponse,
  JiraIssuePayload,
} from '../models/jira-api-types';
import type { JiraTicket } from '../models/jira-ticket.model';
import type { Settings } from '../models/settings.model';

export type JiraConfig = Settings['jira'];

function toPlainTextAdf(text: string): AdfDocument {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0);

  return {
    type: 'doc',
    version: 1,
    content: paragraphs.map((paragraph) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: paragraph.trim() }],
    })),
  };
}

async function postIssue(
  baseUrl: string,
  headers: Record<string, string>,
  fields: JiraIssuePayload['fields'],
): Promise<Response> {
  return fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields }),
  });
}

async function isDescriptionRejected(response: Response): Promise<boolean> {
  if (response.status !== 400) {
    return false;
  }

  try {
    const data = (await response.clone().json()) as JiraErrorResponse;
    return Boolean(data.errors?.description);
  } catch {
    return false;
  }
}

async function getStoryPointsFieldId(baseUrl: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/rest/api/3/field`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return null;
    }

    const fields = (await response.json()) as JiraField[];

    const storyPointsField = fields.find(
      (field) =>
        field.custom &&
        (field.name.toLowerCase().includes('story point') ||
          field.name.toLowerCase() === 'story points' ||
          field.name.toLowerCase() === 'story point estimate'),
    );

    return storyPointsField?.id || null;
  } catch {
    return null;
  }
}

export async function createJiraIssue(
  config: JiraConfig,
  ticket: JiraTicket,
): Promise<{ issueKey: string; url: string }> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');

  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const fields: JiraIssuePayload['fields'] = {
    project: { key: config.projectKey },
    summary: ticket.title,
    description: markdownToAdf(ticket.description),
    issuetype: { name: ticket.issueType || config.defaultIssueType || 'Story' },
  };

  if (ticket.priority) {
    fields.priority = { name: ticket.priority };
  }

  if (config.autoAssignUserId) {
    fields.assignee = { id: config.autoAssignUserId };
  }

  if (ticket.storyPoints !== null && ticket.storyPoints !== undefined) {
    const storyPointsFieldId = await getStoryPointsFieldId(baseUrl, headers);
    if (storyPointsFieldId) {
      fields[storyPointsFieldId] = ticket.storyPoints;
    }
  }

  if (config.customFields) {
    Object.assign(fields, config.customFields);
  }

  const firstResponse = await postIssue(baseUrl, headers, fields);

  /**
   * The markdown converter is not a strict ADF validator, and Jira rejects the whole issue over an invalid description,
   * so fall back to plain paragraphs - a ticket showing raw markdown beats no ticket.
   */
  const response = (await isDescriptionRejected(firstResponse))
    ? await postIssue(baseUrl, headers, { ...fields, description: toPlainTextAdf(ticket.description) })
    : firstResponse;

  if (!response.ok) {
    const status = response.status;
    let errorMessage = `Failed to create Jira issue (HTTP ${status})`;

    try {
      const data = (await response.json()) as JiraErrorResponse;
      const messages = data.errorMessages?.join(', ') || '';
      const fieldErrors = data.errors
        ? Object.entries(data.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '';
      errorMessage = `${errorMessage}: ${messages}${fieldErrors ? ` | ${fieldErrors}` : ''}`;
    } catch {
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const data = (await response.json()) as JiraIssueCreationResponse;
  return {
    issueKey: data.key,
    url: `${baseUrl}/browse/${data.key}`,
  };
}
