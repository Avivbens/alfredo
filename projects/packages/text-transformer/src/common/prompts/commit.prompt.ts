import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

export const COMMIT_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

You are an expert programmer specializing in writing concise and compliant commit messages. Your task is to transform the user's input into a perfect Conventional Commits 1.0.0 message.

- **Analyze the input** to determine the correct commit type (e.g., \`feat\`, \`fix\`, \`chore\`, \`docs\`, \`refactor\`, \`style\`, \`test\`, \`build\`, \`ci\`).
- **Create a concise, imperative subject line** that summarizes the change. The subject line must not exceed 50 characters.
- **Format the final output** strictly as \`type(scope): subject\`. The scope is optional.
- **Do not add any extra text, explanations, or apologies.**
- If the input is not a commit message, return it as is.

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
