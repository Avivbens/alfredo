import { describe, expect, it, jest } from '@jest/globals';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';
import { callModel } from './call-model';

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn(() => ({ invoke: jest.fn(async () => ({ content: 'ok' })) })),
}));

jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn(() => ({ invoke: jest.fn(async () => ({ content: 'ok' })) })),
}));

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(() => ({ invoke: jest.fn(async () => ({ content: 'ok' })) })),
}));

const PROVIDERS = [
  { prefix: 'claude', client: ChatAnthropic, modelField: 'modelName' },
  { prefix: 'gemini', client: ChatGoogleGenerativeAI, modelField: 'model' },
  { prefix: 'gpt', client: ChatOpenAI, modelField: 'modelName' },
] as const;

describe('callModel', () => {
  it.each(Object.values(AvailableModels))('should build the %s client with its own model id', async (model) => {
    const provider = PROVIDERS.find(({ prefix }) => model.startsWith(prefix));
    if (!provider) {
      throw new Error(`No provider registered for model "${model}"`);
    }

    await expect(callModel('api-key', model, { system: 'system', user: 'user' })).resolves.toBe('ok');

    expect(provider.client).toHaveBeenCalledTimes(1);
    expect(provider.client).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'api-key', [provider.modelField]: model }),
    );
    for (const { client } of PROVIDERS.filter((other) => other !== provider)) {
      expect(client).not.toHaveBeenCalled();
    }
  });

  it('should unset the sampling params Claude Haiku 5.5 rejects', async () => {
    await callModel('api-key', AvailableModels.CLAUDE_HAIKU_5_5, { system: 'system', user: 'user' });

    expect(ChatAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ invocationKwargs: { temperature: undefined, top_k: undefined, top_p: undefined } }),
    );
  });

  it('should disable reasoning for GPT-6 Luna', async () => {
    await callModel('api-key', AvailableModels.GPT_6_LUNA, { system: 'system', user: 'user' });

    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({ modelKwargs: { reasoning_effort: 'none' } }));
  });
});
