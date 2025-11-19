/**
 * Atlassian Document Format (ADF) types for Jira descriptions
 */
export interface ADFDocument {
  type: 'doc';
  version: 1;
  content: ADFNode[];
}

export interface ADFNode {
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'codeBlock' | 'text';
  content?: ADFNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{
    type: 'strong' | 'em' | 'code' | 'link';
    attrs?: Record<string, unknown>;
  }>;
}

/**
 * Jira Issue Creation Payload
 */
export interface JiraIssuePayload {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: ADFDocument;
    issuetype: {
      name: string;
    };
    assignee?: {
      id: string;
    };
    priority?: {
      name: string;
    };
    labels?: string[];
    [key: string]: unknown; // For custom fields like story points
  };
}

/**
 * Jira Issue Creation Response
 */
export interface JiraIssueCreationResponse {
  id: string;
  key: string;
  self: string;
}

/**
 * Jira API Error Response
 */
export interface JiraErrorResponse {
  errorMessages: string[];
  errors: Record<string, string>;
}

/**
 * Jira Field Metadata
 */
export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  schema?: {
    type: string;
    custom?: string;
  };
}

/**
 * Service Response Types
 */
export interface JiraServiceSuccessResponse {
  success: true;
  issueKey: string;
  issueId: string;
  url: string;
}

export interface JiraServiceErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string>;
  messages?: string[];
  status?: number;
}

export type JiraServiceResponse = JiraServiceSuccessResponse | JiraServiceErrorResponse;
