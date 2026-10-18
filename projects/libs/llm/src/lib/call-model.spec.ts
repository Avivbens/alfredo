import { describe, expect, it, vi } from 'vitest';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';
import { callModel } from './call-model';

/** The clients are constructed with `new`, which a `vi.fn` arrow implementation cannot serve. */
const { mockClient } = vi.hoisted(() => ({
  mockClient: () =>
    vi.fn(function () {
      return { invoke: vi.fn(async () => ({ text: 'ok' })) };
    }),
}));

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
