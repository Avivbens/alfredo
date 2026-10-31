import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdfDocument, JiraIssuePayload } from '../models/jira-api-types';
import type { JiraTicket } from '../models/jira-ticket.model';
import { SettingsSchema } from '../models/settings.model';
import { createJiraIssue } from './jira-api.service';

type AdfNode = AdfDocument['content'][number];

const { jira: JIRA_CONFIG } = SettingsSchema.parse({
  jira_base_url: 'https://acme.atlassian.net',
  jira_username: 'me@acme.com',
  jira_api_token: 'token',
  jira_project_key: 'PROJ',
});

const BASE_TICKET: JiraTicket = {
  title: 'Dark mode resets on reload',
  description: '',
  storyPoints: null,
  issueType: 'Bug',
  priority: null,
};

/** Shaped like the bug template the extract prompt asks the model for */
const BUG_DESCRIPTION = [
  '**Steps to reproduce:**',
  '1. Open the `Settings` page',
  '2. Toggle **Dark mode** and reload',
  '',
  '**Actual result:**',
  '- The page comes back in light mode',
  '',
  '**Expected result:**',
  '- The page stays in dark mode',
].join('\n');

/** The error Jira Cloud returns for a description that is not valid ADF */
const INVALID_DESCRIPTION_ERROR = {
  errorMessages: [],
  errors: { description: 'Operation value must be an Atlassian Document (see the Atlassian Document Format)' },
};

function toJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

function flattenNodes(nodes: AdfNode[]): AdfNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.content ?? [])]);
}

describe('jira-api.service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockImplementation(async () => toJsonResponse({ id: '10001', key: 'PROJ-1', self: '' }, 201));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function getSentDescription(callIndex = 0): AdfDocument | undefined {
    const [, init] = fetchMock.mock.calls[callIndex] ?? [];
    const { fields } = JSON.parse(String(init?.body)) as JiraIssuePayload;

    return fields.description;
  }

  describe('createJiraIssue', () => {
    it('should convert the markdown description into ADF lists and marks, so Jira renders it instead of showing raw markdown', async () => {
      await createJiraIssue(JIRA_CONFIG, { ...BASE_TICKET, description: BUG_DESCRIPTION });

      const nodes = flattenNodes(getSentDescription()?.content ?? []);
      expect(nodes.map(({ type }) => type)).toEqual(expect.arrayContaining(['orderedList', 'bulletList']));
      expect(nodes.flatMap(({ marks }) => marks ?? []).map(({ type }) => type)).toEqual(
        expect.arrayContaining(['strong', 'code']),
      );
      expect(nodes.filter(({ text }) => text?.includes('**'))).toEqual([]);
    });

    it('should keep a plain-text description as paragraphs', async () => {
      await createJiraIssue(JIRA_CONFIG, { ...BASE_TICKET, description: 'First paragraph\n\nSecond paragraph' });

      expect(getSentDescription()).toEqual({
        type: 'doc',
        version: 1,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph' }] },
        ],
      });
    });

    it('should retry with a plain-text description when Jira rejects the converted one, so the ticket still gets created', async () => {
      fetchMock.mockResolvedValueOnce(toJsonResponse(INVALID_DESCRIPTION_ERROR, 400));

      const result = await createJiraIssue(JIRA_CONFIG, { ...BASE_TICKET, description: '- # Heading in a list' });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getSentDescription(1)).toEqual({
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '- # Heading in a list' }] }],
      });
      expect(result).toEqual({ issueKey: 'PROJ-1', url: 'https://acme.atlassian.net/browse/PROJ-1' });
    });

    it('should not retry when Jira rejects another field', async () => {
      fetchMock.mockResolvedValueOnce(
        toJsonResponse({ errorMessages: [], errors: { priority: 'Priority name is invalid' } }, 400),
      );

      await expect(createJiraIssue(JIRA_CONFIG, { ...BASE_TICKET, description: BUG_DESCRIPTION })).rejects.toThrow(
        'Failed to create Jira issue (HTTP 400):  | priority: Priority name is invalid',
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
