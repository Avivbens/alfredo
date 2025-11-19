/* eslint-disable @typescript-eslint/no-explicit-any */
import { PipelinePromptParams, PromptTemplate } from '@langchain/core/prompts';

const TITLE_FORMAT_SYSTEM_PROMPT = new PromptTemplate({
  inputVariables: ['titleExample'],
  template: `
**Title Format Example:**
{titleExample}

**Critical Instruction:**
- The example above shows the EXACT format, structure, tone, and level of detail you MUST follow for the title.
- Your generated title MUST match this format precisely. It's a template, not just a suggestion.
- Adopt the same tone, specificity, and structure as the provided example.
- Do not deviate from this format.
`,
});

export const TITLE_FORMAT_SYSTEM_PROMPT_PARAM: PipelinePromptParams<any> = {
  name: 'TITLE_FORMAT_SYSTEM_PROMPT',
  prompt: TITLE_FORMAT_SYSTEM_PROMPT,
};
