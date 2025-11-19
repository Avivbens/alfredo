import type { ZodSchema, z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';

const modelMapping: Record<AvailableModels, (apiKey: string) => BaseChatModel> = {
  // ---- Anthropic (Claude variants) ----
  [AvailableModels.CLAUDE_OPUS_4]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_OPUS_4 }),
  [AvailableModels.CLAUDE_SONNET_4]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_SONNET_4 }),
  [AvailableModels.CLAUDE_SONNET_3_7]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_SONNET_3_7 }),
  [AvailableModels.CLAUDE_SONNET_3_5]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_SONNET_3_5 }),
  [AvailableModels.CLAUDE_HAIKU_3_5]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_HAIKU_3_5 }),
  [AvailableModels.CLAUDE_OPUS_3]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, modelName: AvailableModels.CLAUDE_OPUS_3 }),

  // ---- Google (Gemini variants) ----
  [AvailableModels.GOOGLE_GEMINI_1_5_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_1_5_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_1_5_FLASH_8B]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_1_5_FLASH_8B }),
  [AvailableModels.GOOGLE_GEMINI_1_5_PRO]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_1_5_PRO }),
  [AvailableModels.GOOGLE_GEMINI_2_0_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_2_0_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_2_0_FLASH_LITE]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_2_0_FLASH_LITE }),
  [AvailableModels.GOOGLE_GEMINI_2_5_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_2_5_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_2_5_PRO]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_2_5_PRO }),

  // ---- OpenAI (GPT variants) ----
  [AvailableModels.GPT_4_1]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4_1 }),
  [AvailableModels.GPT_4_1_MINI]: (apiKey: string) =>
    new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4_1_MINI }),
  [AvailableModels.GPT_4_1_NANO]: (apiKey: string) =>
    new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4_1_NANO }),
  [AvailableModels.GPT_4O]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4O }),
  [AvailableModels.GPT_4O_MINI]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4O_MINI }),
  [AvailableModels.GPT_4_TURBO]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_4_TURBO }),
  [AvailableModels.O1]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.O1 }),
  [AvailableModels.O3]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.O3 }),
  [AvailableModels.O3_MINI]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.O3_MINI }),
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

export async function callModelWithStructuredResponse<Results extends ZodSchema>(
  token: string,
  modelName: AvailableModels,
  { system, user }: { system: string; user: string },
  schema: Results,
): Promise<z.infer<Results>> {
  const model = initializeModel(token, modelName);

  const messages = [new SystemMessage(system.trim()), new HumanMessage(user.trim())];

  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none',
    strictUnions: true,
  });

  const withSchema = model.withStructuredOutput(jsonSchema);
  const response = await withSchema.invoke(messages);

  const parsed = schema.parse(response);
  return parsed;
}
