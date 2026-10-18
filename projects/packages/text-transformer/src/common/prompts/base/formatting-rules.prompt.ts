/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const FORMATTING_RULES_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: [],
  template: `
**Formatting Rules**
- **Dashes:** You MUST NOT use an em dash (—), an en dash (–) or a double hyphen (--) as punctuation. When a dash is needed, use a single hyphen (-), surrounded by spaces when it separates clauses (e.g. "the build passed - ship it"). This applies even when the original text contains them: replace each one with a single hyphen.
- **Scope:** These rules apply to prose only. Keep anything that is syntax exactly as it is, such as code, command-line flags (e.g. \`--force\`) and Markdown table separator rows.
`,
});

export const FORMATTING_RULES_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'FORMATTING_RULES_SYSTEM_PROMPT',
  prompt: FORMATTING_RULES_SYSTEM_PROMPT,
};
