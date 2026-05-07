import { callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_EVENT_SYSTEM_PROMPT } from '../common/prompts/extract-event-name.prompt';
import { GeminiCalendarEventsSchema } from '../models/calendar-event.model';
import { dateTimezoneNatural, getCurrentTimezone } from './date.service';
import { extractEvent } from './event-extractor.service';

const { AvailableModels } = jest.requireActual('@alfredo/llm');

// Mock the LLM call
jest.mock('@alfredo/llm', () => ({
  callModelWithStructuredResponse: jest.fn(),
}));

// Mock the date service
jest.mock('./date.service', () => ({
  dateTimezoneNatural: jest.fn(() => '2025-01-01T12:00:00'),
  getCurrentTimezone: jest.fn(() => 'Asia/Jerusalem'),
}));

// Mock the prompt
jest.mock('../common/prompts/extract-event-name.prompt', () => ({
  EXTRACT_EVENT_SYSTEM_PROMPT: {
    format: jest.fn(() => Promise.resolve('Formatted Prompt')),
  },
}));

describe('extractEvent', () => {
  const token = 'test-token';
  const model = AvailableModels.GOOGLE_GEMINI_1_5_FLASH;
  const input = 'test input';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the LLM with the correct parameters and return the events', async () => {
    const mockEvents = {
      events: [
        {
          summary: 'Test Event',
          startDate: new Date('2025-01-01T10:00:00.000Z'),
          endDate: new Date('2025-01-01T11:00:00.000Z'),
          allDayEvent: false,
        },
      ],
    };

    (callModelWithStructuredResponse as jest.Mock).mockResolvedValue(mockEvents);

    const result = await extractEvent(token, model, input);

    expect(dateTimezoneNatural).toHaveBeenCalledWith(expect.any(Date));
    expect(getCurrentTimezone).toHaveBeenCalled();
    expect(EXTRACT_EVENT_SYSTEM_PROMPT.format).toHaveBeenCalledWith({
      currentDate: '2025-01-01T12:00:00',
      currentTimezone: 'Asia/Jerusalem',
    });
    expect(callModelWithStructuredResponse).toHaveBeenCalledWith(
      token,
      model,
      { system: 'Formatted Prompt', user: input },
      GeminiCalendarEventsSchema,
    );
    expect(result.events[0]).toEqual({ ...mockEvents.events[0], timeZone: 'Asia/Jerusalem' });
  });

  it('should preserve a model-provided timeZone instead of overriding it', async () => {
    const mockEvents = {
      events: [
        {
          summary: 'NYC trip',
          startDate: new Date('2025-07-04T17:00:00.000Z'),
          endDate: new Date('2025-07-04T18:00:00.000Z'),
          allDayEvent: false,
          timeZone: 'America/New_York',
        },
      ],
    };

    (callModelWithStructuredResponse as jest.Mock).mockResolvedValue(mockEvents);

    const result = await extractEvent(token, model, input);

    expect(result.events[0]?.timeZone).toBe('America/New_York');
  });

  it('should handle errors from the LLM call', async () => {
    const error = new Error('LLM Error');
    (callModelWithStructuredResponse as jest.Mock).mockRejectedValue(error);

    await expect(extractEvent(token, model, input)).rejects.toThrow('LLM Error');
  });
});
