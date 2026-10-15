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
  /**
   * Claude 4.7+ models return 400 for non-default `temperature` / `top_k` / `top_p`, and `@langchain/anthropic` 0.3
   * always sends them (`1`, `-1`, `-1`). `invocationKwargs` is spread last into the request, so it unsets them.
   */
  [AvailableModels.CLAUDE_HAIKU_5_5]: (apiKey: string) =>
    new ChatAnthropic({
      apiKey,
      modelName: AvailableModels.CLAUDE_HAIKU_5_5,
      invocationKwargs: { temperature: undefined, top_k: undefined, top_p: undefined },
    }),

  // ---- Google (Gemini variants) ----
  [AvailableModels.GOOGLE_GEMINI_4_ARGON]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_4_ARGON }),
  [AvailableModels.GOOGLE_GEMINI_3_8_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_3_8_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_3_5_FLASH_LITE]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_3_5_FLASH_LITE }),

  // ---- OpenAI (GPT variants) ----
  [AvailableModels.GPT_6_ASTRA]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_6_ASTRA }),
  [AvailableModels.GPT_6_1_SOL]: (apiKey: string) => new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_6_1_SOL }),
  /**
   * Luna is the default model and reasons at `medium` unless told otherwise, which is too slow for quick Alfred
   * actions. `@langchain/openai` 0.5 only forwards `reasoningEffort` for o-series models, hence `modelKwargs`.
   */
  [AvailableModels.GPT_6_LUNA]: (apiKey: string) =>
    new ChatOpenAI({ apiKey, modelName: AvailableModels.GPT_6_LUNA, modelKwargs: { reasoning_effort: 'none' } }),
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

  /**
   * `zod-to-json-schema` exposes an overloaded signature, and resolving those
   * overloads recurses through zod >= 3.24's very deep `ZodType` definition,
   * tripping TypeScript's instantiation-depth guard (TS2589). Call it through a
   * single non-overloaded signature so the compiler skips overload resolution.
   * Runtime behavior is unchanged — only the static type is simplified.
   */
  const toJsonSchema = zodToJsonSchema as unknown as (
    schema: ZodSchema,
    options: { $refStrategy: 'none' | 'root' | 'relative'; strictUnions: boolean },
  ) => Record<string, unknown>;

  const jsonSchema = toJsonSchema(schema, {
    $refStrategy: 'none',
    strictUnions: true,
  });

  const withSchema = model.withStructuredOutput(jsonSchema);
  const response = await withSchema.invoke(messages);

  const parsed = schema.parse(response);
  return parsed;
}
