import { type AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_TICKET_SYSTEM_PROMPT, EXTRACT_TICKET_USER_PROMPT } from '../common/prompts/extract-ticket.prompt';
import { GeminiJiraTicketSchema, type JiraTicket, JiraTicketSchema } from '../models/jira-ticket.model';

export async function extractTicket(
  token: string,
  model: AvailableModels,
  input: string,
  titleExample?: string,
): Promise<JiraTicket> {
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
  const schema = isGemini ? GeminiJiraTicketSchema : JiraTicketSchema;

  const result = await callModelWithStructuredResponse(token, model, { system, user }, schema);

  // Normalize the result to ensure consistent types (convert undefined to null)
  const ticket: JiraTicket = {
    ...result,
    storyPoints: result.storyPoints ?? null,
    priority: result.priority ?? null,
  };

  return ticket;
}
