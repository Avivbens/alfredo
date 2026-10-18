import { z } from 'zod';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { AvailableModels } from './available-models.enum';

const modelMapping: Record<AvailableModels, (apiKey: string) => BaseChatModel> = {
  // ---- Anthropic (Claude variants) ----
  [AvailableModels.CLAUDE_HAIKU_5_5]: (apiKey: string) =>
    new ChatAnthropic({ apiKey, model: AvailableModels.CLAUDE_HAIKU_5_5 }),

  // ---- Google (Gemini variants) ----
  [AvailableModels.GOOGLE_GEMINI_4_ARGON]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_4_ARGON }),
  [AvailableModels.GOOGLE_GEMINI_3_8_FLASH]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_3_8_FLASH }),
  [AvailableModels.GOOGLE_GEMINI_3_5_FLASH_LITE]: (apiKey: string) =>
    new ChatGoogleGenerativeAI({ apiKey, model: AvailableModels.GOOGLE_GEMINI_3_5_FLASH_LITE }),

  // ---- OpenAI (GPT variants) ----
  [AvailableModels.GPT_6_ASTRA]: (apiKey: string) => new ChatOpenAI({ apiKey, model: AvailableModels.GPT_6_ASTRA }),
  [AvailableModels.GPT_6_1_SOL]: (apiKey: string) => new ChatOpenAI({ apiKey, model: AvailableModels.GPT_6_1_SOL }),
  /**
   * Luna is the default model and reasons at `medium` unless told otherwise, which is too slow for quick Alfred
   * actions.
   */
  [AvailableModels.GPT_6_LUNA]: (apiKey: string) =>
    new ChatOpenAI({ apiKey, model: AvailableModels.GPT_6_LUNA, reasoning: { effort: 'none' } }),
};

function initializeModel(userApiKey: string, selectedModel: AvailableModels) {
  const modelInitializer = modelMapping[selectedModel];
  if (!modelInitializer) {
    throw new Error(`Model "${selectedModel}" is not supported.`);
  }

  return modelInitializer(userApiKey);
}

/**
 * The model must produce the schema's input, before transforms run. Dates have no JSON Schema type, so they go out as
 * ISO date-time strings for `z.coerce.date()` to parse back, and `io: 'input'` leaves objects open unless closed here.
 * The spread drops the hidden `~standard` hook zod attaches to the result, which LangChain would otherwise prefer -
 * regenerating the schema from zod without any of this.
 */
function toModelJsonSchema(schema: z.ZodType) {
  return {
    ...z.toJSONSchema(schema, {
      io: 'input',
      target: 'draft-07',
      unrepresentable: ({ zodSchema }) =>
        zodSchema._zod.def.type === 'date' ? { type: 'string', format: 'date-time' } : undefined,
      override: ({ zodSchema, jsonSchema }) => {
        if (zodSchema._zod.def.type === 'object' && jsonSchema.additionalProperties === undefined) {
          jsonSchema.additionalProperties = false;
        }
      },
    }),
  };
}

export async function callModel(
  token: string,
  modelName: AvailableModels,
  { system, user }: { system: string; user: string },
): Promise<string> {
  const model = initializeModel(token, modelName);

  const messages = [new SystemMessage(system.trim()), new HumanMessage(user.trim())];

  const response = await model.invoke(messages);

  return response.text;
}

export async function callModelWithStructuredResponse<Results extends z.ZodType>(
  token: string,
  modelName: AvailableModels,
  { system, user }: { system: string; user: string },
  schema: Results,
): Promise<z.output<Results>> {
  const model = initializeModel(token, modelName);

  const messages = [new SystemMessage(system.trim()), new HumanMessage(user.trim())];

  const withSchema = model.withStructuredOutput(toModelJsonSchema(schema));
  const response = await withSchema.invoke(messages);

  const parsed = schema.parse(response);
  return parsed;
}
