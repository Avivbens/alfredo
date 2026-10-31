import type { LlmSettingsSchema } from '@alfredo/llm';

export const INFO_PLIST_FILE = 'info.plist';
export const MODEL_VARIABLE = 'selected_model' satisfies keyof (typeof LlmSettingsSchema)['shape'];
