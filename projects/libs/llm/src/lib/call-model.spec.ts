import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ChatAnthropic } from '@langchain/anthropic';
import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';
import { callModel, callModelWithStructuredResponse } from './call-model';

/** The clients are constructed with `new`, which a `vi.fn` arrow implementation cannot serve. */
const { mockClient, withStructuredOutput } = vi.hoisted(() => {
  const withStructuredOutput = vi.fn<(schema: Record<string, unknown>) => { invoke: () => Promise<unknown> }>(() => ({
    invoke: async () => ({ title: 'Lunch', start: '2026-10-19T13:00:00.000Z' }),
  }));

  return {
    withStructuredOutput,
    mockClient: () =>
      vi.fn(function () {
        return { invoke: vi.fn(async () => ({ text: 'ok' })), withStructuredOutput };
      }),
  };
});

vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: mockClient() }));
vi.mock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: mockClient() }));
vi.mock('@langchain/openai', () => ({ ChatOpenAI: mockClient() }));

const PROVIDERS = [
  { prefix: 'claude', client: ChatAnthropic },
  { prefix: 'gemini', client: ChatGoogleGenerativeAI },
  { prefix: 'gpt', client: ChatOpenAI },
] as const;

describe('callModel', () => {
  it.each(Object.values(AvailableModels))('should build the %s client with its own model id', async (model) => {
    const provider = PROVIDERS.find(({ prefix }) => model.startsWith(prefix));
    if (!provider) {
      throw new Error(`No provider registered for model "${model}"`);
    }

    await expect(callModel('api-key', model, { system: 'system', user: 'user' })).resolves.toBe('ok');

    expect(provider.client).toHaveBeenCalledTimes(1);
    expect(provider.client).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'api-key', model }));
    for (const { client } of PROVIDERS.filter((other) => other !== provider)) {
      expect(client).not.toHaveBeenCalled();
    }
  });

  it('should leave the sampling params of Claude Haiku 5.5 to the API defaults', async () => {
    await callModel('api-key', AvailableModels.CLAUDE_HAIKU_5_5, { system: 'system', user: 'user' });

    expect(ChatAnthropic).toHaveBeenCalledWith({ apiKey: 'api-key', model: AvailableModels.CLAUDE_HAIKU_5_5 });
  });

  it('should disable reasoning for GPT-6 Luna', async () => {
    await callModel('api-key', AvailableModels.GPT_6_LUNA, { system: 'system', user: 'user' });

    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({ reasoning: { effort: 'none' } }));
  });
});

describe('callModelWithStructuredResponse', () => {
  const schema = z.object({ title: z.string(), start: z.coerce.date() });

  /**
   * Every provider's `withStructuredOutput` runs the schema through `@langchain/core`'s `toJsonSchema`, which rebuilds
   * anything it still recognizes as a zod schema with zod's defaults - and those reject dates.
   */
  it('should hand the provider a JSON Schema that LangChain uses as-is, with dates as date-time strings', async () => {
    const result = await callModelWithStructuredResponse(
      'api-key',
      AvailableModels.GPT_6_LUNA,
      { system: 'system', user: 'user' },
      schema,
    );

    const [jsonSchema = {}] = withStructuredOutput.mock.lastCall ?? [];
    expect(toJsonSchema(jsonSchema)).toMatchObject({ properties: { start: { type: 'string', format: 'date-time' } } });
    expect(result).toEqual({ title: 'Lunch', start: new Date('2026-10-19T13:00:00.000Z') });
  });
});
