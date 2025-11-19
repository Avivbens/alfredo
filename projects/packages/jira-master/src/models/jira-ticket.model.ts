import { z } from 'zod';

// Base field descriptions
const title = z
  .string()
  .min(1)
  .describe('A concise, one-liner summary of the issue. Should follow the project conventions if example provided.');
const description = z
  .string()
  .min(1)
  .describe('A detailed description of the issue, extracted from the provided text.');
const storyPoints = z
  .number()
  .describe('Estimated story points for the issue (e.g., 1, 2, 3, 5, 8, 13). Can be null if not applicable.');
const issueType = z
  .enum(['Story', 'Task', 'Bug', 'Epic'])
  .describe('The type of issue: Story (new feature), Task (work to be done), Bug (fix), or Epic (large feature).');
const priority = z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest']).describe('Priority level of the issue.');

export const JiraIssueTypeSchema = z.enum(['Story', 'Task', 'Bug', 'Epic']);
export type JiraIssueType = z.infer<typeof JiraIssueTypeSchema>;

export const JiraPrioritySchema = z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest']);
export type JiraPriority = z.infer<typeof JiraPrioritySchema>;

// Schema for OpenAI/Anthropic models: uses .nullable() for optional fields
export const JiraTicketSchema = z.object({
  title,
  description,
  storyPoints: storyPoints.nullable(),
  issueType,
  priority: priority.nullable(),
});

// Schema for Gemini models: uses .optional() for optional fields
export const GeminiJiraTicketSchema = z.object({
  title,
  description,
  storyPoints: storyPoints.optional(),
  issueType,
  priority: priority.optional(),
});

// Array wrapper schemas for multiple ticket extraction
export const OpenAIJiraTicketsSchema = z.object({
  tickets: z.array(JiraTicketSchema),
});

export const GeminiJiraTicketsSchema = z.object({
  tickets: z.array(GeminiJiraTicketSchema),
});

export type JiraTicket = z.infer<typeof JiraTicketSchema>;
export type JiraTickets = {
  tickets: JiraTicket[];
};
