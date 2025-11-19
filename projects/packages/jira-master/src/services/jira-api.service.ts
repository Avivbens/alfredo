import type {
  ADFDocument,
  JiraErrorResponse,
  JiraField,
  JiraIssueCreationResponse,
  JiraIssuePayload,
} from '../models/jira-api-types';
import type { JiraTicket } from '../models/jira-ticket.model';

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  projectKey: string;
  defaultIssueType?: string;
  autoAssignUserId?: string;
}

function convertToADF(text: string): ADFDocument {
  const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0);

  const content = paragraphs.map((paragraph) => {
    const lines = paragraph.split('\n');
    const isBulletList = lines.every((line) => line.trim().match(/^[-*•]\s/));

    if (isBulletList) {
      return {
        type: 'bulletList' as const,
        content: lines.map((line) => ({
          type: 'listItem' as const,
          content: [
            {
              type: 'paragraph' as const,
              content: [
                {
                  type: 'text' as const,
                  text: line.replace(/^[-*•]\s+/, '').trim(),
                },
              ],
            },
          ],
        })),
      };
    }

    return {
      type: 'paragraph' as const,
      content: [
        {
          type: 'text' as const,
          text: paragraph.trim(),
        },
      ],
    };
  });

  return {
    type: 'doc',
    version: 1,
    content,
  };
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
    description: convertToADF(ticket.description),
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

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields }),
  });

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
