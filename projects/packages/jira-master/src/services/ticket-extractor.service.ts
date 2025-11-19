import { type AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_TICKET_SYSTEM_PROMPT, EXTRACT_TICKET_USER_PROMPT } from '../common/prompts/extract-ticket.prompt';
import { GeminiJiraTicketsSchema, type JiraTickets, OpenAIJiraTicketsSchema } from '../models/jira-ticket.model';

export async function extractTicket(
  token: string,
  model: AvailableModels,
  input: string,
  titleExample?: string,
): Promise<JiraTickets> {
  const currentDate = new Date().toISOString().split('T')[0];
  const useTitleFormat = Boolean(titleExample);
  const system = await EXTRACT_TICKET_SYSTEM_PROMPT(useTitleFormat).format({
    currentDate,
    titleExample,
  });

  const user = await EXTRACT_TICKET_USER_PROMPT.format({
    userInput: input,
  });

  // Select appropriate schema based on model
  const isGemini = model.toLowerCase().includes('gemini');
  const schema = isGemini ? GeminiJiraTicketsSchema : OpenAIJiraTicketsSchema;

  const result = await callModelWithStructuredResponse(token, model, { system, user }, schema);

  // Normalize the result to ensure consistent types (convert undefined to null)
  const normalizedTickets = result.tickets.map((ticket) => ({
    ...ticket,
    storyPoints: ticket.storyPoints ?? null,
    priority: ticket.priority ?? null,
  }));

  return { tickets: normalizedTickets };
}
