import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailableModels, callModelWithStructuredResponse } from '@alfredo/llm';
import { EXTRACT_REMINDER_SYSTEM_PROMPT } from '../common/prompts/extract-reminder.prompt';
import { GeminiRemindersSchema, OpenAIRemindersSchema } from '../models/reminder.model';
import { dateTimezoneNatural } from './date.service';
import { extractReminder } from './reminder-extractor.service';

// Mock the LLM call
vi.mock('@alfredo/llm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/llm')>()),
  callModelWithStructuredResponse: vi.fn(),
}));

// Mock the date service
vi.mock('./date.service', () => ({
  dateTimezoneNatural: vi.fn(() => '2026-08-13T12:00:00'),
}));

// Mock the prompt
vi.mock('../common/prompts/extract-reminder.prompt', () => ({
  EXTRACT_REMINDER_SYSTEM_PROMPT: {
    format: vi.fn(() => Promise.resolve('Formatted Prompt')),
  },
}));

describe('extractReminder', () => {
  const token = 'test-token';
  const input = 'test input';
  const mockReminders = {
    reminders: [{ title: 'Call the bank', dueDate: new Date('2026-08-14T09:00:00.000Z'), allDay: false }],
  };

  beforeEach(() => {
    vi.mocked(callModelWithStructuredResponse).mockResolvedValue(mockReminders);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call the LLM with the current date and return the reminders', async () => {
    const result = await extractReminder(token, AvailableModels.GOOGLE_GEMINI_3_8_FLASH, input);

    expect(dateTimezoneNatural).toHaveBeenCalledWith(expect.any(Date));
    expect(EXTRACT_REMINDER_SYSTEM_PROMPT.format).toHaveBeenCalledWith({ currentDate: '2026-08-13T12:00:00' });
    expect(callModelWithStructuredResponse).toHaveBeenCalledWith(
      token,
      AvailableModels.GOOGLE_GEMINI_3_8_FLASH,
      { system: 'Formatted Prompt', user: input },
      GeminiRemindersSchema,
    );
    expect(result).toEqual(mockReminders);
  });

  it('should pick the OpenAI schema variant for a non-Gemini model', async () => {
    await extractReminder(token, AvailableModels.GPT_6_LUNA, input);

    expect(callModelWithStructuredResponse).toHaveBeenCalledWith(
      token,
      AvailableModels.GPT_6_LUNA,
      expect.any(Object),
      OpenAIRemindersSchema,
    );
  });

  it('should handle errors from the LLM call', async () => {
    const error = new Error('LLM Error');
    vi.mocked(callModelWithStructuredResponse).mockRejectedValue(error);

    await expect(extractReminder(token, AvailableModels.GPT_6_LUNA, input)).rejects.toThrow('LLM Error');
  });
});
