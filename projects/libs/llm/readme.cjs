/**
 * Shared README section documenting how to obtain an API key for each LLM
 * provider supported by `@alfredo/llm`.
 *
 * Interpolated into the `.fast-alfred.config.cjs` README of every workflow that
 * consumes an LLM, so the supported-provider list and key-generation URLs stay
 * in sync across all workflows from this single source of truth.
 *
 * Authored as plain CommonJS (not part of the TS `src/`) because
 * `.fast-alfred.config.cjs` files are loaded by the fast-alfred CLI as plain
 * Node modules and cannot resolve the `@alfredo/llm` TS path alias at config time.
 */
const API_KEY_README_SECTION = `### API key

This workflow supports OpenAI, Google Gemini, and Anthropic Claude. Generate an API key for the provider of your selected model:

- **OpenAI:** https://platform.openai.com/settings/organization/api-keys
- **Google Gemini:** https://aistudio.google.com/api-keys
- **Anthropic Claude:** https://console.anthropic.com/settings/keys`;

module.exports = { API_KEY_README_SECTION };
