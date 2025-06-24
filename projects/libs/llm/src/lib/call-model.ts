import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';

const modelMapping: Record<AvailableModels, (apiKey: string) => BaseChatModel> = {
  // ---- Anthropic (Claude variants) ----
  [AvailableModels.CLAUDE_35]: (apiKey: string) => new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_35 }),
  [AvailableModels.CLAUDE_37]: (apiKey: string) => new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_37 }),
  [AvailableModels.CLAUDE_35_HAIKU]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_35_HAIKU }),

  // ---- Google (Gemini variants) ----
  [AvailableModels.GOOGLE_GEMINI_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_FLASH_2]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_FLASH_2 }),
  [AvailableModels.GOOGLE_GEMINI_FLASH_2_LITE]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_FLASH_2_LITE }),

  // ---- OpenAI (GPT variants) ----
  [AvailableModels.GPT_O3]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_O3 }),
  [AvailableModels.GPT_O3_MINI]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_O3_MINI }),

  [AvailableModels.GPT_4O_MINI]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4O_MINI }),
  [AvailableModels.GPT_4O]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4O }),
  [AvailableModels.GPT_O1]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_O1 }),
  [AvailableModels.GPT_O1_MINI]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_O1_MINI }),
};

function initializeModel(userApiKey: string, selectedModel: AvailableModels) {
  const modelInitializer = modelMapping[selectedModel];
  if (!modelInitializer) {
    throw new Error(`Model "${selectedModel}" is not supported.`);
  }

  return modelInitializer(userApiKey);
}

export async function callModel(
  token: string,
  modelName: AvailableModels,
  { system, user }: { system: string; user: string },
): Promise<string> {
  const model = initializeModel(token, modelName);

  const messages = [new SystemMessage(system.trim()), new HumanMessage(user.trim())];

  const response = await model.invoke(messages);

  const res = response.content.toString();
  return res;
}
