import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

const TLDR_SYSTEM_PROMPT_PARAM = new PromptTemplate({
  inputVariables: [],
  template: `You are an expert at creating concise, engaging TL;DR summaries. Your goal is to distill any given text into a 1-2 line summary that is both informative and captivating.

**Instructions:**
1.  **Summarize:** Create a summary that is 1-2 lines long.
2.  **Capture Essence:** The summary must accurately reflect the main subject and key points of the original text.
3.  **Be Engaging:** Write in a way that makes the reader want to know more and read the full text.
4.  **Context-Aware:** If application context is provided, use it to tailor the tone and focus of the summary.`,
});

export const TLDR_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
      {
        name: 'TLDR_SYSTEM_PROMPT',
        prompt: TLDR_SYSTEM_PROMPT_PARAM,
      },
    ],
    finalPrompt: PromptTemplate.fromTemplate(`{NON_INTERACTIVE_SYSTEM_PROMPT}
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT}
{TLDR_SYSTEM_PROMPT}
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''}`),
  });
